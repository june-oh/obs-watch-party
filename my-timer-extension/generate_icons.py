import os
from PIL import Image, ImageDraw

# --- 설정 ---
output_dir = "icons"
sizes = [16, 48, 128]
colors = {
    "inactive": (128, 128, 128, 255),  # 회색 (R, G, B, A)
    "active": (0, 180, 0, 255),      # 녹색
}
file_prefix = "icon"

# --- 아이콘 생성 함수 ---
def create_circle_icon(size, color, filename):
    # 투명 배경의 새 이미지 생성
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    # 원 그리기 (약간의 패딩 포함)
    padding = int(size * 0.1) # 크기의 10% 패딩
    diameter = size - 2 * padding
    # 안티 에일리어싱을 위해 약간 크게 그리기 시도 (간단 구현)
    # draw.ellipse([(padding-1, padding-1), (padding + diameter, padding + diameter)], fill=color)
    # 정확한 좌표로 그리기
    draw.ellipse([(padding, padding), (padding + diameter -1, padding + diameter -1)], fill=color)

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
    for status, color in colors.items():
        for size in sizes:
            # 활성 아이콘은 128px 제외 (필요하면 sizes 리스트 수정)
            if status == "active" and size == 128:
                continue

            filename = os.path.join(output_dir, f"{file_prefix}-{status}-{size}.png")
            create_circle_icon(size, color, filename)

    print("\nIcon generation complete.")
    print("Please ensure the icon paths in manifest.json and background.js are correct.") 