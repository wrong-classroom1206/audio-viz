cmake_minimum_required(VERSION 3.12)
project(fft_project LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

if(EMSCRIPTEN)
    # Output build files directly to the frontend's public folder
    set(CMAKE_RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/public")
    set(CMAKE_ARCHIVE_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/public")
    set(CMAKE_LIBRARY_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/public")

    # Define Emscripten WebAssembly target
    add_executable(fft_wasm core/src/fft.cpp core/src/wasm_interface.cpp)

    # Set compiler & linker options for Emscripten
    target_compile_options(fft_wasm PRIVATE -O3)
    target_link_options(fft_wasm PRIVATE
        "-O3"
        "-s" "WASM=1"
        "-s" "EXPORTED_FUNCTIONS=['_radix2_fft','_fft_process','_malloc','_free']"
        "-s" "EXPORTED_RUNTIME_METHODS=['ccall','cwrap','HEAPF32']"
        "-s" "ALLOW_MEMORY_GROWTH=1"
    )

    # Ensure output file is generated as fft_wasm.js
    set_target_properties(fft_wasm PROPERTIES SUFFIX ".js")
    target_include_directories(fft_wasm PRIVATE core/include)
else()
    # Add Release optimization flags for native build
    if(MSVC)
        add_compile_options(/O2 /LTGC)
        add_link_options(/LTCG)
    else()
        add_compile_options(-O3)
    endif()

    # Build native test target
    add_executable(fft_test
        core/src/fft.cpp
        core/src/main.cpp
    )

    target_include_directories(fft_test PRIVATE core/include)
endif()

