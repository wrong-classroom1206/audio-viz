cmake_minimum_required(VERSION 3.12)
project(fft_test LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Add Release optimization flags
if(MSVC)
    add_compile_options(/O2 /LTGC)
    add_link_options(/LTCG)
else()
    add_compile_options(-O3)
endif()

# Build target
add_executable(fft_test
    core/src/fft.cpp
    core/src/main.cpp
)

target_include_directories(fft_test PRIVATE core/include)
