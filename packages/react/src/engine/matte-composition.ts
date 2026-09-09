export function composeMatte(
  base: Uint8ClampedArray,
  white: Uint8ClampedArray,
  image: Uint8ClampedArray,
  output: Uint8ClampedArray,
) {
  for (let i = 0; i < output.length; i += 4) {
    for (let c = 0; c < 3; c++)
      output[i + c] =
        base[i + c] + ((white[i + c] - base[i + c]) * image[i + c]) / 255;
    output[i + 3] = base[i + 3];
  }
}
