#define Texture uSampler
#define VertexCoord aVertexPosition
#define TexCoord aTextureCoord

		
// Haven't put these as parameters as it would slow the code down.
#define SCANLINES
#define MULTISAMPLE
#define GAMMA
//#define FAKE_GAMMA
//#define CURVATURE
//#define SHARPER
// MASK_TYPE: 0 = none, 1 = green/magenta, 2 = trinitron(ish)
#define MASK_TYPE 1


#ifdef GL_ES
#define COMPAT_PRECISION mediump
precision mediump float;
#else
#define COMPAT_PRECISION
#endif

#ifdef PARAMETER_UNIFORM
uniform COMPAT_PRECISION float CURVATURE_X;
uniform COMPAT_PRECISION float CURVATURE_Y;
uniform COMPAT_PRECISION float MASK_BRIGHTNESS;
uniform COMPAT_PRECISION float SCANLINE_WEIGHT;
uniform COMPAT_PRECISION float SCANLINE_GAP_BRIGHTNESS;
uniform COMPAT_PRECISION float BLOOM_FACTOR;
uniform COMPAT_PRECISION float INPUT_GAMMA;
uniform COMPAT_PRECISION float OUTPUT_GAMMA;
#else
#define CURVATURE_X 0.10
#define CURVATURE_Y 0.25
#define MASK_BRIGHTNESS 0.70
#define SCANLINE_WEIGHT 10.0
#define SCANLINE_GAP_BRIGHTNESS 0.12
#define BLOOM_FACTOR 3.5
#define INPUT_GAMMA 2.4
#define OUTPUT_GAMMA 2.2
#endif

/* COMPATIBILITY
   - GLSL compilers
*/

uniform vec2 TextureSize;
#if defined(CURVATURE)
varying vec2 screenScale;
#endif
varying vec2 TEX0;
varying float filterWidth;

#if defined(VERTEX)
uniform mat4 MVPMatrix;
attribute vec4 VertexCoord;
attribute vec2 TexCoord;
uniform vec2 InputSize;
uniform vec2 OutputSize;

void main()
{
#if defined(CURVATURE)
	screenScale = TextureSize / InputSize;
#endif
	filterWidth = (InputSize.y / OutputSize.y) / 3.0;
	TEX0 = TexCoord;
	gl_Position = MVPMatrix * VertexCoord;
}
#elif defined(FRAGMENT)

uniform sampler2D Texture;

#if defined(CURVATURE)
vec2 CURVATURE_DISTORTION = vec2(CURVATURE_X, CURVATURE_Y);
// Barrel distortion shrinks the display area a bit, this will allow us to counteract that.
vec2 barrelScale = 1.0 - (0.23 * CURVATURE_DISTORTION);

vec2 Distort(vec2 coord)
{
	coord *= screenScale;
	coord -= vec2(0.5);
	float rsq = coord.x * coord.x + coord.y * coord.y;
	coord += coord * (CURVATURE_DISTORTION * rsq);
	coord *= barrelScale;
	if (abs(coord.x) >= 0.5 || abs(coord.y) >= 0.5)
		coord = vec2(-1.0);		// If out of bounds, return an invalid value.
	else
	{
		coord += vec2(0.5);
		coord /= screenScale;
	}

	return coord;
}
#endif

float CalcScanLineWeight(float dist)
{
	return max(1.0-dist*dist*SCANLINE_WEIGHT, SCANLINE_GAP_BRIGHTNESS);
}

float CalcScanLine(float dy)
{
	float scanLineWeight = CalcScanLineWeight(dy);
#if defined(MULTISAMPLE)
	scanLineWeight += CalcScanLineWeight(dy-filterWidth);
	scanLineWeight += CalcScanLineWeight(dy+filterWidth);
	scanLineWeight *= 0.3333333;
#endif
	return scanLineWeight;
}

void main()
{
#if defined(CURVATURE)
	vec2 texcoord = Distort(TEX0);
	if (texcoord.x < 0.0)
		gl_FragColor = vec4(0.0);
	else
#else
	vec2 texcoord = TEX0;
#endif
	{
		vec2 texcoordInPixels = texcoord * TextureSize;
#if defined(SHARPER)
		vec2 tempCoord = floor(texcoordInPixels) + 0.5;
		vec2 coord = tempCoord / TextureSize;
		vec2 deltas = texcoordInPixels - tempCoord;
		float scanLineWeight = CalcScanLine(deltas.y);
		vec2 signs = sign(deltas);
		deltas.x *= 2.0;
		deltas = deltas * deltas;
		deltas.y = deltas.y * deltas.y;
		deltas.x *= 0.5;
		deltas.y *= 8.0;
		deltas /= TextureSize;
		deltas *= signs;
		vec2 tc = coord + deltas;
#else
		float tempY = floor(texcoordInPixels.y) + 0.5;
		float yCoord = tempY / TextureSize.y;
		float dy = texcoordInPixels.y - tempY;
		float scanLineWeight = CalcScanLine(dy);
		float signY = sign(dy);
		dy = dy * dy;
		dy = dy * dy;
		dy *= 8.0;
		dy /= TextureSize.y;
		dy *= signY;
		vec2 tc = vec2(texcoord.x, yCoord + dy);
#endif

		vec3 colour = texture2D(Texture, tc).rgb;
		//colour += texture2D(Texture, tc + vec2(1.0/512.0,0.0)).rgb * vec3(0.5, 0.15, 0.15);
		//colour += texture2D(Texture, tc + vec2(-1.0/512.0,0.0)).rgb * vec3(0, 0.1, 0.1);

#if defined(SCANLINES)
#if defined(GAMMA)
#if defined(FAKE_GAMMA)
		colour = colour * colour;
#else
		colour = pow(colour, vec3(INPUT_GAMMA));
#endif
#endif
		scanLineWeight *= BLOOM_FACTOR;
		colour *= scanLineWeight;

#if defined(GAMMA)
#if defined(FAKE_GAMMA)
		colour = sqrt(colour);
#else
		colour = pow(colour, vec3(1.0/OUTPUT_GAMMA));
#endif
#endif
#endif
#if MASK_TYPE == 0
		gl_FragColor = vec4(colour, 1.0);
#else
#if MASK_TYPE == 1
		float whichMask = fract(gl_FragCoord.x * 0.5);
		vec3 mask;
		if (whichMask < 0.5)
			mask = vec3(MASK_BRIGHTNESS, 1.0, MASK_BRIGHTNESS);
		else
			mask = vec3(1.0, MASK_BRIGHTNESS, 1.0);
#elif MASK_TYPE == 2
		float whichMask = fract(gl_FragCoord.x * 0.3333333);
		vec3 mask = vec3(MASK_BRIGHTNESS, MASK_BRIGHTNESS, MASK_BRIGHTNESS);
		if (whichMask < 0.3333333)
			mask.x = 1.0;
		else if (whichMask < 0.6666666)
			mask.y = 1.0;
		else
			mask.z = 1.0;
#endif

		gl_FragColor = vec4(colour * mask, 1.0);
#endif
	}
}
#endif