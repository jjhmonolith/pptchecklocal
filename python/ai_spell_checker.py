#!/usr/bin/env python3
"""
OpenAI GPT를 사용한 한국어 맞춤법 검사 및 교정 제안 생성
"""

import sys
import json
import os
from typing import List, Dict, Any

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False

class SpellChecker:
    def __init__(self, api_key: str = None):
        if not OPENAI_AVAILABLE:
            raise ImportError("openai 라이브러리가 설치되지 않았습니다.")
        
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        if not self.api_key:
            raise ValueError("OpenAI API 키가 필요합니다.")
        
        self.client = openai.OpenAI(api_key=self.api_key)

    def analyze_text(self, text: str, context: Dict[str, Any] = None) -> List[Dict[str, Any]]:
        """
        주어진 텍스트의 맞춤법을 검사하고 교정 제안을 생성합니다.
        
        Args:
            text (str): 검사할 텍스트
            context (dict): 컨텍스트 정보 (슬라이드 번호, 모양 ID 등)
            
        Returns:
            List[Dict]: 교정 제안 목록
        """
        
        if not text.strip():
            return []
        
        # GPT 프롬프트 생성
        prompt = self._create_spell_check_prompt(text)
        
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",  # 비용 효율적인 모델 사용
                messages=[
                    {
                        "role": "system", 
                        "content": "당신은 한국어 맞춤법 검사 전문가입니다. 주어진 텍스트의 맞춤법, 띄어쓰기, 문법, 일관성, 문체를 검사하고 JSON 형태로 교정 제안을 제공합니다."
                    },
                    {
                        "role": "user", 
                        "content": prompt
                    }
                ],
                temperature=0.1,  # 일관성 있는 결과를 위해 낮은 온도
                max_tokens=2000,
                response_format={ "type": "json_object" }
            )
            
            # JSON 응답 파싱
            result_text = response.choices[0].message.content
            result = json.loads(result_text)
            
            # 결과를 우리 형식에 맞게 변환
            suggestions = []
            if 'corrections' in result:
                for correction in result['corrections']:
                    suggestion = {
                        'original': correction.get('original', ''),
                        'revised': correction.get('revised', ''),
                        'type': correction.get('type', 'spelling'),
                        'reason': correction.get('reason', ''),
                        'severity': correction.get('severity', 'med'),
                        'position': correction.get('position', {'start': 0, 'end': len(text)})
                    }
                    
                    # 컨텍스트 정보 추가
                    if context:
                        suggestion.update({
                            'slideIndex': context.get('slideIndex', 1),
                            'shapeId': context.get('shapeId', ''),
                            'runPath': context.get('runPath', [0, 0])
                        })
                    
                    suggestions.append(suggestion)
            
            return suggestions
            
        except Exception as e:
            print(f"AI 분석 오류: {str(e)}", file=sys.stderr)
            return []

    def _create_spell_check_prompt(self, text: str) -> str:
        """맞춤법 검사를 위한 프롬프트 생성"""
        
        return f"""
다음 한국어 텍스트의 맞춤법, 띄어쓰기, 문법, 일관성, 문체를 검사하고 교정 제안을 JSON 형태로 제공해 주세요.

검사할 텍스트:
"{text}"

다음 기준으로 검사해 주세요:
1. **맞춤법 (spelling)**: 잘못된 철자
2. **띄어쓰기 (spacing)**: 잘못된 띄어쓰기
3. **문법 (grammar)**: 문법적 오류
4. **일관성 (consistency)**: 용어나 표기의 일관성
5. **문체 (style)**: 더 나은 표현이나 간결한 문장

응답 형식 (JSON):
{{
  "corrections": [
    {{
      "original": "원본 텍스트",
      "revised": "교정된 텍스트", 
      "type": "spelling|spacing|grammar|consistency|style",
      "reason": "교정 이유 설명",
      "severity": "high|med|low",
      "position": {{"start": 시작위치, "end": 끝위치}}
    }}
  ]
}}

중요한 점:
- 명확한 오류만 교정 제안하세요
- 교정 이유를 명확히 설명하세요  
- 심각도(severity)를 적절히 판단하세요
- 원본과 교정본이 동일한 경우는 제외하세요
- 빈 배열 {{}} 도 유효한 응답입니다 (오류가 없는 경우)
"""

    def process_pptx_data(self, pptx_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        PPTX 데이터를 처리하여 전체적인 맞춤법 검사 결과를 생성합니다.
        
        Args:
            pptx_data (dict): PPTX 분석 결과 데이터
            
        Returns:
            dict: 맞춤법 검사 결과
        """
        
        all_suggestions = []
        total_text_length = 0
        
        # 각 슬라이드의 각 도형의 텍스트를 검사
        for slide in pptx_data.get('slides', []):
            slide_index = slide.get('slideIndex', 1)
            
            for shape in slide.get('shapes', []):
                shape_id = shape.get('shapeId', '')
                
                # 도형의 모든 텍스트 런을 하나로 합침
                full_text = ''
                text_runs = shape.get('textRuns', [])
                
                for run in text_runs:
                    full_text += run.get('text', '')
                    total_text_length += len(run.get('text', ''))
                
                if full_text.strip():
                    # 컨텍스트 정보 준비
                    context = {
                        'slideIndex': slide_index,
                        'shapeId': shape_id,
                        'runPath': [0, 0]  # 기본값
                    }
                    
                    # AI로 텍스트 분석
                    suggestions = self.analyze_text(full_text, context)
                    all_suggestions.extend(suggestions)
        
        # 결과 구성
        result = {
            'jobId': f'ai-job-{int(time.time() * 1000)}',
            'suggestions': all_suggestions,
            'stats': {
                'slides': len(pptx_data.get('slides', [])),
                'shapes': sum(len(slide.get('shapes', [])) for slide in pptx_data.get('slides', [])),
                'runs': sum(len(shape.get('textRuns', [])) for slide in pptx_data.get('slides', []) for shape in slide.get('shapes', [])),
                'tokensEstimated': total_text_length
            }
        }
        
        return result


def main():
    """메인 함수 - 명령줄에서 실행할 때 사용"""
    
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "사용법: python ai_spell_checker.py '<텍스트>' [API_키] 또는 python ai_spell_checker.py --pptx-data '<JSON데이터>' --api-key '<키>'"
        }))
        sys.exit(1)
    
    try:
        # PPTX 데이터 모드 확인
        if '--pptx-data' in sys.argv:
            pptx_data_idx = sys.argv.index('--pptx-data')
            api_key_idx = sys.argv.index('--api-key')
            
            pptx_data_json = sys.argv[pptx_data_idx + 1]
            api_key = sys.argv[api_key_idx + 1]
            
            pptx_data = json.loads(pptx_data_json)
            
            checker = SpellChecker(api_key)
            result = checker.process_pptx_data(pptx_data)
            
        else:
            # 단일 텍스트 모드
            text = sys.argv[1]
            api_key = sys.argv[2] if len(sys.argv) > 2 else None
            
            checker = SpellChecker(api_key)
            suggestions = checker.analyze_text(text)
            
            result = {
                'jobId': f'text-job-{int(time.time() * 1000)}',
                'suggestions': suggestions,
                'stats': {
                    'original_length': len(text),
                    'suggestions_count': len(suggestions),
                    'slides': 1,
                    'shapes': 1,
                    'runs': 1,
                    'tokensEstimated': len(text)
                }
            }
        
        print(json.dumps(result, ensure_ascii=False, indent=2))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e)
        }), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    import time
    main()