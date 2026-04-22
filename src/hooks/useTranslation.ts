import { useAppStore } from '@/store/appStore';

type Translations = Record<string, Record<string, string>>;

const translations: Translations = {
  en: {
    // General
    'Save Settings': 'Save Settings',
    'General': 'General',
    'Appearance': 'Appearance',
    'API Keys': 'API Keys',
    'My Account': 'My Account',
    'Billing': 'Billing',
    'Create Agent': 'Create Agent',
    'Settings': 'Settings',
    'Chats': 'Chats',
    'Workflows': 'Workflows',
    'Agents': 'Agents',
    'Profile': 'Profile',
    // Add more English keys here as needed
  },
  zh: {
    // General
    'Save Settings': '保存设置',
    'General': '通用',
    'Appearance': '外观',
    'API Keys': 'API 密钥',
    'My Account': '我的账户',
    'Billing': '账单',
    'Create Agent': '创建智能体',
    'Settings': '设置',
    'Chats': '聊天',
    'Workflows': '工作流',
    'Agents': '智能体',
    'Profile': '个人主页',
    'Language': '语言',
    'Theme': '主题',
    'System': '跟随系统',
    'Light': '浅色',
    'Dark': '深色',
    'Model Provider': '模型服务商',
    'Local (Ollama/LM Studio)': '本地 (Ollama/LM Studio)',
    'Custom Endpoint': '自定义端点',
    'Custom API Base URL': '自定义 API Base URL',
    'Custom Model ID': '自定义模型 ID',
    'Custom API Protocol': '自定义 API 协议',
    'OpenAI Compatible': 'OpenAI 兼容',
    'Manage and configure your AI assistants.': '管理和配置您的AI助手。',
    'Select an agent from the sidebar or create a new one.': '从侧边栏选择一个智能体或创建一个新的。',
    'Name': '名称',
    'Description': '描述',
    'Avatar URL (Optional)': '头像链接 (可选)',
    'Industry': '行业',
    'System Prompt': '系统提示词',
    'Model Configuration': '模型配置',
    'Advanced Parameters': '高级参数',
    'Temperature': '温度 (Temperature)',
    'Max Tokens (Optional)': '最大 Token 数 (可选)',
    'Save Changes': '保存更改',
    'Edit Agent Configuration': '编辑智能体配置',
    'Test Chat': '测试聊天',
    'Select Industry': '选择行业',
    'Select a provider': '选择服务商',
    'Technology': '科技',
    'Edit Agent': '编辑智能体',
    'Create New Agent': '创建新智能体',
    'Theme Preference': '主题偏好',
    'Toggle Theme': '切换主题',
    '+ Add Node...': '+ 添加节点...',
    'Save Workflow': '保存工作流',
    'Trigger Node': '触发器节点',
    'Agent Node': '智能体节点',
    'Condition Node': '条件节点',
    'SubWorkflow Node': '子工作流节点',
    'Action Node': '动作节点',
    'Data Transformation Node': '数据转换节点',
    'Output Node': '输出节点',
    'Workflow saved successfully!': '工作流保存成功！',
    'Configure in sidebar': '在侧边栏配置',
    'No agents found. Create a new one to get started.': '没有找到智能体。创建一个新的以开始。',





    'Model Settings': '模型设置',
    'API Provider': 'API 服务商',
    'Protocol': '协议',
    'Base URL': 'Base URL',
    'Model ID': '模型 ID',

    'Healthcare': '医疗',
    'Finance': '金融',
    'Education': '教育',
    'Creative': '创意',
    'Manage global application settings.': '管理全局应用设置。'
  }
};

export function useTranslation() {
  const language = useAppStore(state => state.settings.language);

  const t = (key: string): string => {
    // Fallback to English, then to the key itself if not found
    const langDict = translations[language] || translations['en'];
    return langDict[key] || translations['en'][key] || key;
  };

  return { t, language };
}
