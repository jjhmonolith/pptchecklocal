/**
 * PPTX 파일 수정 라이브러리
 * JSZip을 사용하여 PowerPoint 파일의 텍스트를 수정
 */

import JSZip from 'jszip';

export interface Correction {
  slideIndex: number;
  shapeId: string;
  runPath: number[];
  original: string;
  revised: string;
  type: string;
  reason: string;
  severity: string;
}

export class PPTXModifier {
  
  /**
   * URL에서 PPTX 파일을 다운로드하고 교정사항을 적용하여 새 파일 생성
   */
  static async applyCorrections(fileUrl: string, corrections: Correction[], authToken?: string): Promise<ArrayBuffer> {
    console.log('PPTX 파일 다운로드 시작:', fileUrl);
    
    try {
      // 파일 다운로드 (인증 헤더 포함)
      const headers: HeadersInit = {};
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      const response = await fetch(fileUrl, { headers });
      if (!response.ok) {
        throw new Error(`파일 다운로드 실패: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('파일 다운로드 완료, 크기:', arrayBuffer.byteLength, 'bytes');
      
      // ZIP 파일로 읽기
      const zip = await JSZip.loadAsync(arrayBuffer);
      console.log('ZIP 파일 로드 완료');
      
      // 교정사항 적용
      await this.applyCorrectionsToZip(zip, corrections);
      
      // 수정된 ZIP 파일 생성
      const modifiedBuffer = await zip.generateAsync({ type: 'arraybuffer' });
      console.log('수정된 PPTX 파일 생성 완료, 크기:', modifiedBuffer.byteLength, 'bytes');
      
      return modifiedBuffer;
      
    } catch (error) {
      console.error('PPTX 수정 오류:', error);
      throw error;
    }
  }
  
  /**
   * ZIP 파일에서 각 슬라이드의 XML을 수정
   */
  private static async applyCorrectionsToZip(zip: JSZip, corrections: Correction[]): Promise<void> {
    console.log(`${corrections.length}개 교정사항 적용 시작`);
    
    // 슬라이드별로 교정사항 그룹화
    const correctionsBySlide = new Map<number, Correction[]>();
    corrections.forEach(correction => {
      const slideIndex = correction.slideIndex;
      if (!correctionsBySlide.has(slideIndex)) {
        correctionsBySlide.set(slideIndex, []);
      }
      correctionsBySlide.get(slideIndex)!.push(correction);
    });
    
    // 각 슬라이드 수정
    for (const [slideIndex, slideCorrections] of correctionsBySlide) {
      const slideFileName = `ppt/slides/slide${slideIndex}.xml`;
      const slideFile = zip.files[slideFileName];
      
      if (slideFile) {
        console.log(`슬라이드 ${slideIndex} 수정 중 (${slideCorrections.length}개 교정사항)`);
        
        const slideXml = await slideFile.async('text');
        const modifiedXml = this.applyCorrectionsToSlideXML(slideXml, slideCorrections);
        
        // 수정된 XML을 ZIP에 다시 저장
        zip.file(slideFileName, modifiedXml);
        
        console.log(`슬라이드 ${slideIndex} 수정 완료`);
      } else {
        console.warn(`슬라이드 파일을 찾을 수 없습니다: ${slideFileName}`);
      }
    }
  }
  
  /**
   * 개별 슬라이드 XML에 교정사항 적용
   */
  private static applyCorrectionsToSlideXML(xml: string, corrections: Correction[]): string {
    let modifiedXml = xml;
    
    // 교정사항을 역순으로 적용 (뒤에서부터 수정해야 인덱스가 안 꼬임)
    const sortedCorrections = [...corrections].sort((a, b) => 
      b.original.length - a.original.length // 긴 텍스트부터 교체
    );
    
    for (const correction of sortedCorrections) {
      try {
        // XML에서 해당 텍스트를 찾아 교체
        // <a:t> 태그 내의 텍스트를 교체
        const escapedOriginal = this.escapeXml(correction.original);
        const escapedRevised = this.escapeXml(correction.revised);
        
        // 정확한 매칭을 위한 정규식
        const regex = new RegExp(`(<a:t[^>]*>)(.*?)${escapedOriginal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(.*?)(</a:t>)`, 'g');
        
        modifiedXml = modifiedXml.replace(regex, (match, openTag, before, after, closeTag) => {
          console.log(`텍스트 교체: "${correction.original}" → "${correction.revised}"`);
          return `${openTag}${before}${escapedRevised}${after}${closeTag}`;
        });
        
      } catch (error) {
        console.error(`교정사항 적용 오류: ${correction.original}`, error);
      }
    }
    
    return modifiedXml;
  }
  
  /**
   * XML에서 사용할 수 있도록 특수 문자 이스케이프
   */
  private static escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}