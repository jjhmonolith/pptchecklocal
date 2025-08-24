/**
 * Node.js용 PPTX 파일 파서
 * Python 대신 JSZip을 사용하여 PowerPoint 파일을 분석
 */

import JSZip from 'jszip';

export interface TextRun {
  text: string;
  paragraph_idx: number;
  run_idx: number;
  font_name?: string;
  font_size?: number;
  is_bold?: boolean;
  is_italic?: boolean;
}

export interface PPTXShape {
  shapeId: string;
  shapeType: string;
  textRuns: TextRun[];
}

export interface PPTXSlide {
  slideIndex: number;
  shapes: PPTXShape[];
}

export interface PPTXAnalysisResult {
  slides: PPTXSlide[];
  stats: {
    slides: number;
    shapes: number;
    runs: number;
    tokensEstimated: number;
  };
}

export class PPTXParser {
  
  /**
   * URL에서 PPTX 파일을 다운로드하고 분석
   */
  static async analyzeFromUrl(fileUrl: string): Promise<PPTXAnalysisResult> {
    console.log('PPTX 파일 다운로드 시작:', fileUrl);
    
    try {
      // 파일 다운로드
      const response = await fetch(fileUrl);
      if (!response.ok) {
        throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('파일 다운로드 완료, 크기:', arrayBuffer.byteLength, 'bytes');
      
      return await this.analyzeBuffer(arrayBuffer);
      
    } catch (error) {
      console.error('PPTX 분석 오류:', error);
      throw error;
    }
  }

  /**
   * Buffer에서 PPTX 파일 분석 (파일시스템 기반)
   */
  static async analyzeFromBuffer(buffer: Buffer, filename: string): Promise<PPTXAnalysisResult> {
    console.log('PPTX 파일 버퍼 분석 시작:', filename, 'bytes:', buffer.length);
    
    try {
      // Buffer를 ArrayBuffer로 변환
      const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
      console.log('ArrayBuffer 변환 완료, 크기:', arrayBuffer.byteLength, 'bytes');
      
      return await this.analyzeBuffer(arrayBuffer as ArrayBuffer);
      
    } catch (error) {
      console.error('PPTX 버퍼 분석 오류:', error);
      throw error;
    }
  }
  
  /**
   * ArrayBuffer로부터 PPTX 분석
   */
  static async analyzeBuffer(buffer: ArrayBuffer): Promise<PPTXAnalysisResult> {
    try {
      // ZIP 파일로 읽기
      const zip = await JSZip.loadAsync(buffer);
      console.log('ZIP 파일 로드 완료');
      
      const slides: PPTXSlide[] = [];
      let totalShapes = 0;
      let totalRuns = 0;
      let totalTokens = 0;
      
      // 슬라이드 파일들 찾기 (ppt/slides/slide1.xml, slide2.xml, ...)
      const slideFiles = Object.keys(zip.files)
        .filter(filename => filename.match(/^ppt\/slides\/slide\d+\.xml$/))
        .sort((a, b) => {
          const aNum = parseInt(a.match(/slide(\d+)\.xml$/)?.[1] || '0');
          const bNum = parseInt(b.match(/slide(\d+)\.xml$/)?.[1] || '0');
          return aNum - bNum;
        });
        
      console.log('발견된 슬라이드 파일들:', slideFiles);
      
      // 각 슬라이드 처리
      for (let i = 0; i < slideFiles.length; i++) {
        const slideFile = slideFiles[i];
        const slideXml = await zip.files[slideFile].async('text');
        
        console.log(`슬라이드 ${i + 1} 처리 중...`);
        
        const slideData = this.parseSlideXML(slideXml, i + 1);
        if (slideData.shapes.length > 0) {
          slides.push(slideData);
          totalShapes += slideData.shapes.length;
          totalRuns += slideData.shapes.reduce((sum, shape) => sum + shape.textRuns.length, 0);
          totalTokens += slideData.shapes.reduce((sum, shape) => 
            sum + shape.textRuns.reduce((textSum, run) => textSum + run.text.length, 0), 0
          );
        }
      }
      
      const result = {
        slides,
        stats: {
          slides: slides.length,
          shapes: totalShapes,
          runs: totalRuns,
          tokensEstimated: Math.round(totalTokens * 1.2) // 대략적 토큰 추정
        }
      };
      
      console.log('PPTX 분석 완료:', result.stats);
      return result;
      
    } catch (error) {
      console.error('PPTX 버퍼 분석 오류:', error);
      throw error;
    }
  }
  
  /**
   * 슬라이드 XML을 파싱하여 텍스트박스별로 텍스트 추출
   */
  private static parseSlideXML(xml: string, slideIndex: number): PPTXSlide {
    const shapes: PPTXShape[] = [];
    
    try {
      // PowerPoint XML 구조에서 각 셰이프(텍스트박스)별로 분리
      // <p:sp> 태그가 각각의 셰이프(텍스트박스)를 나타냄
      const shapeRegex = /<p:sp[^>]*>[\s\S]*?<\/p:sp>/g;
      const shapeMatches = [...xml.matchAll(shapeRegex)];
      
      console.log(`슬라이드 ${slideIndex}: ${shapeMatches.length}개 셰이프 발견`);
      
      shapeMatches.forEach((shapeMatch, shapeIndex) => {
        const shapeXml = shapeMatch[0];
        
        // 각 셰이프에서 텍스트 추출
        const textRegex = /<a:t[^>]*>(.*?)<\/a:t>/g;
        const textRuns: TextRun[] = [];
        let textMatch;
        let runIndex = 0;
        
        while ((textMatch = textRegex.exec(shapeXml)) !== null) {
          const text = textMatch[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .trim();
            
          if (text) {
            textRuns.push({
              text,
              paragraph_idx: 0,
              run_idx: runIndex++,
              font_name: '기본',
              font_size: 12,
              is_bold: shapeXml.includes('<a:b val="1"/>') || shapeXml.includes('<a:b/>'),
              is_italic: shapeXml.includes('<a:i val="1"/>') || shapeXml.includes('<a:i/>')
            });
          }
        }
        
        // 텍스트가 있는 셰이프만 추가
        if (textRuns.length > 0) {
          shapes.push({
            shapeId: `shape-${slideIndex}-${shapeIndex + 1}`,
            shapeType: 'TEXT_BOX',
            textRuns
          });
          console.log(`셰이프 ${shapeIndex + 1}: ${textRuns.length}개 텍스트런, "${textRuns.map(r => r.text).join(' ').substring(0, 50)}..."`);
        }
      });
      
      // 백업: p:sp 태그로 찾지 못한 경우 기존 방식 사용
      if (shapes.length === 0) {
        console.log(`슬라이드 ${slideIndex}: p:sp 태그 없음, 기존 방식으로 fallback`);
        const textRegex = /<a:t[^>]*>(.*?)<\/a:t>/g;
        const textRuns: TextRun[] = [];
        let match;
        let runIndex = 0;
        
        while ((match = textRegex.exec(xml)) !== null) {
          const text = match[1]
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .trim();
            
          if (text) {
            textRuns.push({
              text,
              paragraph_idx: 0,
              run_idx: runIndex++,
              font_name: '기본',
              font_size: 12,
              is_bold: xml.includes('<a:b val="1"/>') || xml.includes('<a:b/>'),
              is_italic: xml.includes('<a:i val="1"/>') || xml.includes('<a:i/>')
            });
          }
        }
        
        if (textRuns.length > 0) {
          shapes.push({
            shapeId: `shape-${slideIndex}-1`,
            shapeType: 'TEXT_BOX',
            textRuns
          });
        }
      }
      
    } catch (error) {
      console.error(`슬라이드 ${slideIndex} XML 파싱 오류:`, error);
    }
    
    return {
      slideIndex,
      shapes
    };
  }
}