#ifndef FFT_H
#define FFT_H

#include <vector>
#include <complex>

void radix2_fft(std::vector<std::complex<float>>& x);

#ifdef __cplusplus
extern "C" {
#endif

void radix2_fft(float* buffer, int n);

#ifdef __cplusplus
}
#endif

#endif // FFT_H
