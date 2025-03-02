#!/usr/bin/env python3
"""
Image to Bitmap Converter
Converts PNG or JPEG images to a bitmap format that fits within a 576x136 window.
"""

import argparse
import os
from PIL import Image


def resize_image(image, max_width=576, max_height=136):
    """
    Resize the image to fit within the specified dimensions while maintaining aspect ratio.
    
    Args:
        image: PIL Image object
        max_width: Maximum width
        max_height: Maximum height
        
    Returns:
        Resized PIL Image object
    """
    original_width, original_height = image.size
    
    # Calculate the scaling factor to fit within the window
    width_ratio = max_width / original_width
    height_ratio = max_height / original_height
    scale_factor = min(width_ratio, height_ratio)
    
    # Calculate new dimensions
    new_width = int(original_width * scale_factor)
    new_height = int(original_height * scale_factor)
    
    # Resize the image
    return image.resize((new_width, new_height), Image.LANCZOS)


def convert_to_bitmap(input_path, output_path=None):
    """
    Convert an image to monochrome bitmap and save it.
    
    Args:
        input_path: Path to the input image (PNG or JPEG)
        output_path: Path to save the output bitmap. If None, creates one based on input name.
    
    Returns:
        Path to the saved bitmap file
    """
    # Check if the input file exists
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input file not found: {input_path}")
    
    # Check if the input file is a PNG or JPEG
    _, ext = os.path.splitext(input_path)
    if ext.lower() not in ['.png', '.jpg', '.jpeg']:
        raise ValueError(f"Unsupported file format: {ext}. Only PNG and JPEG are supported.")
    
    # Generate output path if not provided
    if output_path is None:
        output_path = os.path.splitext(input_path)[0] + '.bmp'
    
    # Open the image
    with Image.open(input_path) as img:
        # Resize the image
        resized_img = resize_image(img)
        
        # Convert to grayscale first
        grayscale_img = resized_img.convert('L')
        
        # Convert to monochrome (1-bit) using threshold
        monochrome_img = grayscale_img.convert('1')
        
        # Save as monochrome bitmap
        monochrome_img.save(output_path, 'BMP')
    
    return output_path


def main():
    """Main function to parse arguments and convert the image."""
    parser = argparse.ArgumentParser(description='Convert PNG/JPEG images to bitmap that fits in 576x136 window')
    parser.add_argument('input_image', help='Path to the input PNG or JPEG image')
    parser.add_argument('-o', '--output', help='Path to save the output bitmap (optional)')
    
    args = parser.parse_args()
    
    try:
        output_path = convert_to_bitmap(args.input_image, args.output)
        print(f"Image successfully converted and saved to: {output_path}")
    except Exception as e:
        print(f"Error: {e}")
        return 1
    
    return 0


if __name__ == "__main__":
    exit(main())