# 小程序大模型对接实现总结

## 概述

本文档详细说明了小程序如何通过 API 与大模型对接的完整实现，从用户输入到文本解析再到自动填入的每个环节。

## 完整流程

### 阶段一：用户输入与触发

1. **用户输入**
   - 用户在 `textarea` 中输入角色描述
   - `bindinput="onInputChange"` 实时更新 `data.inputText`
   - 输入限制：最大 500 字符

2. **触发生成**
   - 点击"生成人设卡"按钮触发 `generateCharacter()`
   - 设置 `loading: true` 显示加载状态
   - 显示"AI生成中..."提示

### 阶段二：基础信息提取（第一次 AI 调用）

#### 2.1 调用流程
```
generateCharacter() 
  → api.extractBasicInfoFromText(inputText)
    → callDoubaoAPI(prompt, 'extractBasicInfo')
      → callAIAPI(prompt, 'extractBasicInfo')
        → wx.cloud.extend.AI.createModel("deepseek")
          → model.streamText()
```

#### 2.2 提示词构建
- **位置**: `miniprogram/utils/api.js` - `extractBasicInfoFromText()`
- **特点**:
  - 结构化 Markdown 格式
  - 明确的提取规则
  - 详细的字段说明
  - 严格的 JSON 格式要求

#### 2.3 AI API 调用参数
- **模型**: `deepseek-r1-0528`
- **Temperature**: `0.1` (低温度确保输出确定性)
- **Max Tokens**: `500` (基础信息通常很短)
- **System Prompt**: "你是一个专业的实体识别系统。请严格按照JSON格式返回结果..."

#### 2.4 流式响应处理
- **超时处理**: 60秒超时保护
- **进度检测**: 每10个事件记录一次进度
- **无进度检测**: 检测到100个事件无进度自动退出
- **错误处理**: 解析失败时尝试多种方法恢复

#### 2.5 JSON 解析
- **工具**: `miniprogram/utils/jsonParser.js`
- **方法**:
  1. 直接解析整个文本
  2. 提取最外层 JSON 对象
  3. 正则表达式匹配 JSON
  4. 移除 markdown 代码块标记
- **验证**: `validateBasicInfo()` 验证并规范化基础信息

### 阶段三：完整角色卡生成（第二次 AI 调用）

#### 3.1 调用流程
```
generateCharacter() 
  → api.generateCharacter(inputText)
    → callDoubaoAPI(prompt, 'character')
      → callAIAPI(prompt, 'character')
        → wx.cloud.extend.AI.createModel("deepseek")
          → model.streamText()
```

#### 3.2 提示词构建
- **位置**: `miniprogram/utils/api.js` - `generateCharacter()`
- **特点**:
  - 详细的生成要求
  - 每个字段的说明
  - 长度建议
  - 严格的 JSON 格式要求

#### 3.3 AI API 调用参数
- **模型**: `deepseek-r1-0528`
- **Temperature**: `0.7` (中等温度允许创作性)
- **Max Tokens**: `2000` (完整角色卡需要更多 tokens)
- **System Prompt**: "你是一个专业的角色创作助手。请严格按照JSON格式返回结果..."

#### 3.4 JSON 解析与验证
- **解析**: 使用 `jsonParser.safeParseJSON()` 解析
- **验证**: 使用 `jsonParser.validateCharacter()` 验证并规范化
- **字段确保**: 确保所有必需字段存在

### 阶段四：数据合并与自动填入

#### 4.1 合并策略
- **优先级**: 第一步提取的基础信息 > 第二步生成的基础信息
- **逻辑**: 
  - 如果第一步提取的信息不为空，使用第一步的信息
  - 否则使用第二步生成的信息
  - 如果都为空，使用默认值

#### 4.2 字段合并
- **姓名**: 优先使用第一步提取的姓名，否则使用第二步生成的姓名，默认"未命名"
- **年龄**: 优先使用第一步提取的年龄，否则使用第二步生成的年龄
- **性别**: 优先使用第一步提取的性别，否则使用第二步生成的性别
- **身份**: 优先使用第一步提取的身份，否则使用第二步生成的身份

#### 4.3 UI 更新
- 使用 `setData()` 更新 `result` 数据
- WXML 自动渲染角色卡
- 显示成功提示

### 阶段五：错误处理

#### 5.1 错误分类
- **云开发未初始化**: 提示检查配置
- **AI 能力不可用**: 提示更新基础库或开通 AI 能力
- **API 调用失败**: 显示具体错误信息
- **JSON 解析失败**: 提示数据解析失败

#### 5.2 错误处理策略
- 不使用本地模拟降级
- 直接显示错误信息
- 提供友好的错误提示
- 记录详细的错误日志

## 关键文件

### 1. `miniprogram/utils/api.js`
- `callAIAPI()`: AI API 调用核心函数
- `callDoubaoAPI()`: 统一的 API 调用入口
- `extractBasicInfoFromText()`: 基础信息提取
- `generateCharacter()`: 完整角色卡生成

### 2. `miniprogram/utils/jsonParser.js`
- `extractJSON()`: 从文本中提取 JSON
- `safeParseJSON()`: 安全解析 JSON
- `validateBasicInfo()`: 验证基础信息
- `validateCharacter()`: 验证角色定义

### 3. `miniprogram/pages/character/index.js`
- `generateCharacter()`: 主生成函数
- 数据合并逻辑
- 错误处理
- UI 更新

## 优化点

### 1. 提示词工程
- ✅ 结构化 Markdown 格式
- ✅ 明确的提取规则
- ✅ 详细的字段说明
- ✅ 严格的 JSON 格式要求

### 2. 流式响应处理
- ✅ 超时处理（60秒）
- ✅ 进度检测
- ✅ 无进度检测
- ✅ 错误恢复机制

### 3. JSON 解析
- ✅ 多种解析方法
- ✅ 容错处理
- ✅ 数据验证
- ✅ 规范化处理

### 4. 数据合并
- ✅ 清晰的合并策略
- ✅ 优先级规则
- ✅ 详细的日志记录

### 5. 错误处理
- ✅ 错误分类
- ✅ 友好提示
- ✅ 详细日志

### 6. 日志记录
- ✅ 关键步骤日志
- ✅ 性能监控
- ✅ 错误追踪
- ✅ 调试信息

## 性能优化

1. **并发处理**: 两步 AI 调用可以并行（未来优化）
2. **超时保护**: 60秒超时防止无限等待
3. **进度检测**: 防止无限循环
4. **错误恢复**: 多种解析方法提高成功率

## 使用示例

```javascript
// 用户输入
const inputText = "二次元少女，16岁，傲娇性格，粉色双马尾，魔法师身份"

// 第一步：提取基础信息
const basicInfo = await api.extractBasicInfoFromText(inputText)
// 返回: {"name": "", "age": "16", "gender": "女", "identity": "魔法师"}

// 第二步：生成完整角色卡
const character = await api.generateCharacter(inputText)
// 返回: 完整的角色定义对象

// 第三步：合并数据
// 优先使用第一步提取的基础信息
const mergedCharacter = mergeBasicInfo(character, basicInfo)
```

## 测试建议

1. **正常流程测试**: 输入完整的角色描述，验证生成结果
2. **边界情况测试**: 输入不完整的描述，验证容错处理
3. **错误处理测试**: 模拟 API 错误，验证错误处理
4. **性能测试**: 测试响应时间和超时处理

## 未来优化

1. **并行调用**: 两步 AI 调用可以并行执行
2. **缓存机制**: 缓存相似输入的生成结果
3. **增量更新**: 支持增量更新角色卡
4. **用户反馈**: 支持用户反馈和改进生成结果

## 总结

本实现通过两个步骤的 AI 调用（基础信息提取 + 完整角色卡生成），实现了从用户输入到自动填入的完整流程。通过优化的提示词、健壮的 JSON 解析、清晰的数据合并策略和详细的错误处理，确保了系统的可靠性和用户体验。

