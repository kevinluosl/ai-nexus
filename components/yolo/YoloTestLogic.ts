import { useState } from 'react';

/**
 * 检测结果对象接口
 * 对应后端 API 返回的 detection 数组中的项
 */
export interface DetectionResult {
  class: string;
  confidence: number;
  bbox: [number, number, number, number]; // [x1, y1, x2, y2]
}

/**
 * API 响应接口
 */
interface YoloApiResponse {
  success: boolean;
  detections: DetectionResult[];
  image: string; // Base64 编码的已标注图片
  count: number;
  error?: string;
}

/**
 * YOLO 检测页面的业务逻辑 Hook
 */
export const useYoloTest = () => {
  // 状态定义
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [detections, setDetections] = useState<DetectionResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 处理文件选择
   */
  const handleFileChange = (file: File) => {
    // 验证文件类型
    if (!file.type.startsWith('image/')) {
      setError('请上传有效的图片文件 (JPG, PNG, GIF)');
      return;
    }

    // 重置状态
    setSelectedFile(file);
    setResultImage(null);
    setDetections([]);
    setError(null);

    // 生成预览 URL
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreviewUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  /**
   * 调用后端 API 进行检测
   */
  const detectObjects = async () => {
    if (!selectedFile) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('image', selectedFile);

    try {
      // 这里的 /api 是通过 Vite 代理转发到 localhost:5000 的
      // 使用 127.0.0.1 在 vite.config.ts 中配置以避免 localhost 解析问题
      const response = await fetch('/api/detect', {
        method: 'POST',
        body: formData,
      });

      // 检查是否返回了 HTML (通常意味着代理失败，返回了 index.html)
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('text/html')) {
         throw new Error('连接后端服务失败 (Proxy Error)。请确认 Python 后端已在端口 5000 启动。');
      }

      if (!response.ok) {
         throw new Error(`请求失败: ${response.status} ${response.statusText}`);
      }

      const data: YoloApiResponse = await response.json();

      if (data.success) {
        setResultImage(data.image); // 后端返回的是 Base64 Data URI
        setDetections(data.detections);
      } else {
        setError(data.error || '检测失败，服务器返回错误');
      }
    } catch (err: any) {
      console.error('YOLO Detection Error:', err);
      // 区分不同类型的错误以提供更好的提示
      if (err.message.includes('Proxy Error') || err.message.includes('Failed to fetch')) {
          setError('无法连接到检测服务。请确保本地 Python 后端已启动 (http://localhost:5000)');
      } else {
          setError(err.message || '网络请求发生意外错误');
      }
    } finally {
      setLoading(false);
    }
  };

  /**
   * 重置页面状态
   */
  const reset = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setResultImage(null);
    setDetections([]);
    setError(null);
  };

  return {
    selectedFile,
    previewUrl,
    resultImage,
    detections,
    loading,
    error,
    handleFileChange,
    detectObjects,
    reset
  };
};