import os
from PIL import Image, ImageDraw

# --- 설정 ---
# output_dir = "icons"
# 스크립트 파일의 위치를 기준으로 icons 폴더 경로 설정
script_dir = os.path.dirname(os.path.abspath(__file__))
output_dir = os.path.join(script_dir, "icons")

sizes = [16, 48, 128]
colors = {
    "inactive": (128, 128, 128, 255),  # 회색 (R, G, B, A)
    "connected": (0, 180, 0, 255),     # 녹색
    "error": (255, 0, 0, 255)         # 빨간색
}
file_prefix = "icon" # 파일명 접두사 (예: icon-connected-16.png)

# --- 아이콘 생성 함수 ---
def create_circle_icon(size, color, filename):
    # 투명 배경의 새 이미지 생성
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # 원 그리기 (약간의 패딩 포함)
    padding = int(size * 0.1) # 크기의 10% 패딩
    # 원의 실제 지름은 이미지 크기에서 양쪽 패딩을 뺀 값
    # draw.ellipse의 두 번째 좌표는 (x1+width, y1+height)가 아니라 (x2, y2)이므로 diameter로 계산
    # 시작점 (padding, padding), 끝점 (size - padding -1, size - padding -1)
    # ellipse는 바운딩 박스를 받으므로, x0, y0, x1, y1
    # x1 = x0 + width, y1 = y0 + height. 여기서 width와 height는 diameter.
    # diameter = size - 2 * padding
    # draw.ellipse([(padding, padding), (padding + diameter, padding + diameter)], fill=color) # 이전 방식
    draw.ellipse([(padding, padding), (size - padding - 1, size - padding - 1)], fill=color)

    # 파일로 저장
    try:
        image.save(filename, "PNG")
        print(f"Saved: {filename}")
    except Exception as e:
        print(f"Error saving {filename}: {e}")

# --- 메인 실행 ---
if __name__ == "__main__":
    # 출력 디렉토리 확인 및 생성
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Created directory: {output_dir}")

    # 각 상태와 크기에 대해 아이콘 생성
    for status, color_tuple in colors.items(): # 변수명 color -> color_tuple로 변경 (내장 함수와 충돌 방지)
        for size in sizes:
            filename = os.path.join(output_dir, f"{file_prefix}-{status}-{size}.png")
            create_circle_icon(size, color_tuple, filename)

    print("\nIcon generation complete.")
    print(f"Please ensure icons are in the '{output_dir}' folder and paths in manifest.json and background-script.js match.") 