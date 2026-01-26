import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // 현재 작업 디렉토리에서 환경 변수 로드
  const env = loadEnv(mode, process.cwd(), '');
  const isGASBuild = mode === 'gas';

  return {
    server: {
      port: 3000,
      host: '0.0.0.0'
    },
    
    plugins: [
      react()
    ],

    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'), // 보통 src를 @로 잡습니다 (필요 시 '.'으로 변경)
      }
    },

    define: {
      // GAS 빌드시 API 키를 빈 문자열로 (런타임에 GAS PropertiesService에서 가져옴)
      // 개발 모드일 때는 .env 파일 값을 사용
      'import.meta.env.VITE_GEMINI_API_KEY': isGASBuild 
        ? JSON.stringify('') 
        : JSON.stringify(env.GEMINI_API_KEY || env.VITE_GEMINI_API_KEY),
      'process.env.API_KEY': isGASBuild 
        ? JSON.stringify('') 
        : JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': isGASBuild 
        ? JSON.stringify('') 
        : JSON.stringify(env.GEMINI_API_KEY),
      // GAS 빌드 여부 플래그
      '__GAS_BUILD__': JSON.stringify(isGASBuild)
    },

    build: {
      // GAS 호환성을 위해 타겟을 낮춥니다 (구형 브라우저/Webview 대응)
      target: 'es2015',
      outDir: isGASBuild ? 'dist-gas' : 'dist',
      
      // CSS와 에셋을 완전히 인라인화
      cssCodeSplit: false,
      assetsInlineLimit: 100000000, 

      rollupOptions: {
        output: {
          // 중요: GAS는 ES Module을 지원하지 않으므로 IIFE(즉시실행함수)로 변환
          format: 'iife', 
          inlineDynamicImports: true, // 동적 import를 하나로 합침
          manualChunks: undefined,    // 청크 분리 방지 (단일 파일 보장)
          entryFileNames: 'assets/[name].js',
          assetFileNames: 'assets/[name].[ext]',
        }
      },

      // 파일 크기 최적화 (Terser 사용)
      minify: 'terser',
      terserOptions: {
        format: {
          comments: false,  // 모든 주석(라이선스 포함) 제거
        },
        compress: {
          drop_console: isGASBuild,  // GAS 빌드 시 console.log 제거
          drop_debugger: true,
          pure_funcs: isGASBuild ? ['console.log', 'console.info', 'console.debug'] : []
        }
      }
    }
  };
});