#include "fft.h"
#include <vector>
#include <complex>

extern "C" {

void fft_process(float* real_array, float* imag_array, int size) {
    if (size <= 0 || !real_array || !imag_array) {
        return;
    }

    // Stack-allocate the temporary std::vector buffer and map incoming raw arrays
    std::vector<std::complex<float>> buffer(size);
    for (int i = 0; i < size; ++i) {
        buffer[i] = std::complex<float>(real_array[i], imag_array[i]);
    }

    // Run our optimized radix2_fft function on that buffer
    radix2_fft(buffer);

    // Write computed real and imaginary results back directly into the pointers
    for (int i = 0; i < size; ++i) {
        real_array[i] = buffer[i].real();
        imag_array[i] = buffer[i].imag();
    }
}

}
