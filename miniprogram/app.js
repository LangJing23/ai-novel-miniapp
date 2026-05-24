App({
  onLaunch() {
    if (!wx.cloud) {
      console.warn('请在 2.2.3 或以上基础库使用云能力，将使用本地模拟模式');
    } else {
      try {
        // 初始化云开发
        // 方式1：不指定 env，使用微信开发者工具中当前选择的环境（推荐）
        // 方式2：如果方式1失败，尝试使用指定的环境 ID
        console.log('========================================');
        console.log('🌐 初始化云开发环境...');
        console.log('💡 提示：小程序将自动使用微信开发者工具中当前选择的环境');
        console.log('💡 如果环境不存在，请在微信开发者工具中创建或选择环境');
        console.log('========================================');
        
        // 方式1：不指定 env，让系统自动使用当前环境（推荐）
        // 这样小程序会自动使用微信开发者工具中当前选择的环境
        let initSuccess = false
        try {
          // 不指定 env，使用默认环境（微信开发者工具中当前选择的环境）
          wx.cloud.init({
            traceUser: true,
            // 不指定 env，系统会自动使用当前环境
          });
          console.log('✅ 云开发初始化成功（使用默认环境）');
          console.log('📌 使用的环境：微信开发者工具中当前选择的环境');
          initSuccess = true
        } catch (defaultError) {
          console.warn('⚠️  默认环境初始化失败，尝试使用指定环境 ID:', defaultError);
        }
        
        if (!initSuccess) {
          console.error('❌ 云开发初始化失败，请在微信开发者工具中选择自己的云开发环境');
        }
        
        if (initSuccess) {
          console.log('========================================');
        }
        
        // 检查 AI 能力是否可用
        console.log('========================================');
        console.log('🔍 检查 AI 能力...');
        if (wx.cloud.extend && wx.cloud.extend.AI) {
          console.log('✅ AI 能力可用');
          try {
            const testModel = wx.cloud.extend.AI.createModel("deepseek");
            console.log('✅ AI 模型创建测试成功:', typeof testModel);
            console.log('📌 模型对象:', testModel ? '存在' : '不存在');
            if (testModel && typeof testModel.streamText === 'function') {
              console.log('✅ streamText 方法可用');
            } else {
              console.warn('⚠️  streamText 方法不可用，可用方法:', testModel ? Object.keys(testModel) : 'N/A');
            }
          } catch (aiError) {
            console.error('❌ AI 模型创建测试失败:', aiError);
            console.error('错误详情:', aiError.message);
          }
        } else {
          console.error('❌ AI 能力不可用');
          if (!wx.cloud.extend) {
            console.error('❌ wx.cloud.extend 不存在，可能需要更新基础库版本');
          } else if (!wx.cloud.extend.AI) {
            console.error('❌ wx.cloud.extend.AI 不存在，可能需要开通AI能力');
          }
        }
        console.log('========================================');
      } catch (e) {
        console.warn('云开发初始化失败，将使用本地模拟模式', e);
      }
    }
  },
  globalData: {
    envId: '', // 使用微信开发者工具中当前选择的云开发环境
    useCloud: true // 标记是否使用云开发
  }
});
