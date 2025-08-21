# Python PPTX 분석 모듈

이 모듈은 PowerPoint(.pptx) 파일을 분석하여 텍스트를 추출하고 구조화된 데이터로 반환합니다.

## 설치 방법

### 1. Python 설치 (필요한 경우)
```bash
# macOS (Homebrew 사용)
brew install python3

# Ubuntu/Debian
sudo apt update
sudo apt install python3 python3-pip

# Windows
# https://www.python.org/downloads/ 에서 Python 다운로드
```

### 2. 의존성 설치
```bash
cd python
pip install -r requirements.txt
```

또는 개별 설치:
```bash
pip install python-pptx==1.0.2
pip install requests==2.32.3
pip install openai==1.59.0
```

## 사용 방법

### 1. 직접 실행
```bash
python3 pptx_analyzer.py "https://example.com/presentation.pptx"
```

### 2. Node.js에서 호출 (현재 구현)
- `/api/analyze` 엔드포인트에서 자동으로 호출됩니다
- 파일 URL을 전달하면 Python 스크립트가 실행됩니다

## 출력 형식

```json
{
  "slides": [
    {
      "slideIndex": 1,
      "shapes": [
        {
          "shapeId": "shape-1-1",
          "shapeType": "MSO_SHAPE_TYPE.TEXT_BOX",
          "textRuns": [
            {
              "text": "텍스트 내용",
              "paragraph_idx": 0,
              "run_idx": 0,
              "font_name": "맑은 고딕",
              "font_size": 18,
              "is_bold": false,
              "is_italic": false
            }
          ]
        }
      ]
    }
  ],
  "stats": {
    "slides": 3,
    "shapes": 8,
    "runs": 15,
    "tokensEstimated": 450
  }
}
```

## 오류 처리

1. **python-pptx 라이브러리 없음**: 
   - `pip install python-pptx` 실행
   
2. **파일 다운로드 실패**:
   - URL이 올바른지 확인
   - 네트워크 연결 확인
   
3. **PPTX 파일 손상**:
   - 파일이 올바른 PowerPoint 형식인지 확인

## 개발 환경에서 테스트

```bash
# 테스트 스크립트 실행
python3 pptx_analyzer.py "https://mock-storage.example.com/test.pptx"
```

Mock URL인 경우 실제 다운로드는 실패하지만, 스크립트 구조는 확인할 수 있습니다.