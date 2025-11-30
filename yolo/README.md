# YOLO 目标检测 Demo

这是一个基于 YOLOv8 的网页目标检测演示应用。

## 功能特点

- 🎯 使用 Ultralytics YOLOv8 进行实时目标检测
- 📸 支持图片上传（点击或拖拽）
- 🖼️ 实时显示检测结果和标注图片
- 📊 显示检测到的目标列表和置信度

## 环境要求

- Python 3.8+
- Conda 环境（推荐）

## 安装步骤

### 1. 创建并激活 Conda 环境（如果还没有）

```bash
conda create -n yolo python=3.10
conda activate yolo
```

### 2. 安装依赖

```bash
# 安装 ultralytics（会自动安装 PyTorch）
conda install -c conda-forge ultralytics

# 或者使用 pip 安装所有依赖
pip install -r requirements.txt
```

### 3. 运行应用

```bash
python app.py
```

### 4. 访问网页

打开浏览器访问：http://localhost:5000

## 使用说明

1. 点击上传区域或拖拽图片到上传区域
2. 等待检测完成（首次运行会自动下载 YOLOv8 模型）
3. 查看检测结果：
   - 左侧显示原始图片
   - 右侧显示标注了检测框的结果图片
   - 下方显示检测到的所有目标及其置信度

## API 接口说明

### 1. 获取前端页面

**接口地址：** `GET /`

**功能说明：** 
- 这是应用的首页接口，用于返回前端用户界面
- 当用户在浏览器中访问网站根路径时，会返回 `index.html` 文件
- 该页面提供了图片上传、拖拽上传、实时检测结果展示等功能
- 主要用于Web浏览器访问，提供友好的图形化操作界面

**使用场景：**
- 用户在浏览器中打开网站首页
- 需要获取前端页面进行展示

**请求示例：**
```bash
curl http://localhost:5000/
```

**响应：** HTML页面内容（`index.html` 文件）

---

### 2. 图片目标检测接口

**接口地址：** `POST /api/detect`

**功能说明：**
- 这是核心的图片检测接口，用于对上传的图片进行YOLO目标检测
- 接收用户上传的图片文件，使用YOLO11模型进行目标识别和定位
- 自动识别图片中的各种目标（如人、车、动物、物品等），并返回检测结果
- 在原始图片上绘制检测框和标签，生成标注后的图片
- 返回检测到的所有目标信息，包括类别名称、置信度和边界框坐标
- 支持多种图片格式（JPG、PNG、GIF等），自动处理RGBA格式转换为RGB

**使用场景：**
- 前端页面上传图片后调用此接口进行检测
- 第三方应用集成YOLO检测功能
- 批量图片检测处理
- API服务调用

**处理流程：**
1. 接收上传的图片文件
2. 读取并解析图片数据
3. 将图片转换为RGB格式（如需要）
4. 使用YOLO11模型进行目标检测
5. 解析检测结果，提取目标类别、置信度和坐标
6. 在图片上绘制检测框和标签
7. 将标注后的图片编码为Base64格式
8. 返回JSON格式的检测结果

**请求方式：** `POST`

**Content-Type：** `multipart/form-data`

**请求参数：**

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| image | File | 是 | 要检测的图片文件（支持JPG、PNG、GIF等格式） |

**请求示例：**

使用 curl：
```bash
curl -X POST http://localhost:5000/api/detect \
  -F "image=@/path/to/your/image.jpg"
```

使用 Python requests：
```python
import requests

url = "http://localhost:5000/api/detect"
files = {'image': open('image.jpg', 'rb')}
response = requests.post(url, files=files)
result = response.json()
```

**响应格式：**

成功响应（HTTP 200）：
```json
{
  "success": true,
  "detections": [
    {
      "class": "person",
      "confidence": 0.95,
      "bbox": [100.5, 200.3, 300.2, 500.8]
    },
    {
      "class": "car",
      "confidence": 0.87,
      "bbox": [400.1, 150.2, 600.5, 350.9]
    }
  ],
  "image": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "count": 2
}
```

错误响应（HTTP 400/500）：
```json
{
  "error": "错误信息描述"
}
```

**响应字段说明：**

| 字段名 | 类型 | 说明 |
|--------|------|------|
| success | Boolean | 请求是否成功 |
| detections | Array | 检测到的目标列表 |
| detections[].class | String | 目标类别名称（如：person, car, dog等） |
| detections[].confidence | Float | 置信度（0-1之间的浮点数） |
| detections[].bbox | Array | 边界框坐标 [x1, y1, x2, y2] |
| image | String | 标注后的图片（Base64编码的PNG格式，data URI格式） |
| count | Integer | 检测到的目标数量 |
| error | String | 错误信息（仅在失败时返回） |

**边界框坐标说明：**
- `x1, y1`: 左上角坐标
- `x2, y2`: 右下角坐标
- 坐标单位为像素

**错误码：**

| HTTP状态码 | 说明 |
|-----------|------|
| 200 | 请求成功 |
| 400 | 请求参数错误（如：未上传图片、文件名为空） |
| 500 | 服务器内部错误（如：模型加载失败、检测过程出错） |

## 模型说明

默认使用 `yolo11n.pt`（nano版本），速度最快但精度较低。

如果需要更高精度，可以在 `app.py` 中修改模型：
- `yolo11n.pt` - Nano（最快）
- `yolo11s.pt` - Small
- `yolo11m.pt` - Medium
- `yolo11l.pt` - Large
- `yolo11x.pt` - XLarge（最精确）

## 注意事项

- 首次运行会自动加载 YOLO 模型文件
- 确保 `yolo11n.pt` 文件存在于项目根目录
- 建议使用 GPU 加速以获得更好的性能
- 图片会自动转换为RGB格式进行处理
- 返回的标注图片为PNG格式的Base64编码字符串

