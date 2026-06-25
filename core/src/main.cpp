#include <iostream>
#include <vector>
#include <complex>
#include <cmath>
#include <iomanip>
#include "fft.h"

constexpr float PI = 3.14159265358979323846f;

int main() {
    const int N = 1024;
    const float sample_rate = 44100.0f;
    const float f1 = 440.0f;
    const float f2 = 1000.0f;

    std::vector<std::complex<float>> signal(N);

    // Generate dummy audio signal (mixed 440Hz and 1000Hz sine waves)
    for (int n = 0; n < N; ++n) {
        float t = static_cast<float>(n) / sample_rate;
        float val = std::sin(2.0f * PI * f1 * t) + std::sin(2.0f * PI * f2 * t);
        signal[n] = std::complex<float>(val, 0.0f);
    }

    // Run Radix-2 FFT
    radix2_fft(signal);

    std::cout << std::fixed << std::setprecision(2);
    std::cout << "--- FFT Test Output (First 30 Bins) ---" << std::endl;
    std::cout << std::setw(6) << "Bin" << std::setw(15) << "Frequency (Hz)" << std::setw(15) << "Magnitude" << std::endl;
    std::cout << std::string(38, '-') << std::endl;

    for (int k = 0; k < 30; ++k) {
        float freq = k * sample_rate / N;
        float magnitude = std::abs(signal[k]);
        std::cout << std::setw(6) << k 
                  << std::setw(15) << freq 
                  << std::setw(15) << magnitude << std::endl;
    }

    return 0;
}
