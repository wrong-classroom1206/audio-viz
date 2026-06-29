#include "fft.h"
#include <cmath>
#include <algorithm>

constexpr float PI = 3.14159265358979323846f;

void radix2_fft(std::vector<std::complex<float>>& x) {
    int n = static_cast<int>(x.size());
    if (n <= 1) return;

    // Bit-reversal permutation
    for (int i = 1, j = 0; i < n; ++i) {
        int bit = n >> 1;
        for (; j & bit; bit >>= 1) {
            j ^= bit;
        }
        j ^= bit;

        if (i < j) {
            std::swap(x[i], x[j]);
        }
    }

    // Iterative Cooley-Tukey butterfly compute
    for (int len = 2; len <= n; len <<= 1) {
        float angle = -2.0f * PI / len;
        std::complex<float> wlen = std::polar(1.0f, angle);
        for (int i = 0; i < n; i += len) {
            std::complex<float> w(1.0f, 0.0f);
            for (int j = 0; j < len / 2; ++j) {
                std::complex<float> u = x[i + j];
                std::complex<float> v = x[i + j + len / 2] * w;
                x[i + j] = u + v;
                x[i + j + len / 2] = u - v;
                w *= wlen;
            }
        }
    }
}

extern "C" void radix2_fft(float* buffer, int n) {
    std::vector<std::complex<float>> temp(n);
    for (int i = 0; i < n; ++i) {
        temp[i] = std::complex<float>(buffer[2 * i], buffer[2 * i + 1]);
    }
    radix2_fft(temp);
    for (int i = 0; i < n; ++i) {
        buffer[2 * i] = temp[i].real();
        buffer[2 * i + 1] = temp[i].imag();
    }
}

