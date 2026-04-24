import { useAppStore } from '@/store/appStore';

type Translations = Record<string, Record<string, string>>;


const translations: Translations = {
  en: {
    // Layout & Navigation
    'Chats': 'Chats',
    'Workflows': 'Workflows',
    'Agents': 'Agents',
    'Prompts': 'Prompts',
    'System Prompts': 'System Prompts',
    'Saved Templates': 'Saved Templates',
    'Settings': 'Settings',
    'Profile': 'Profile',
    'Toggle Theme': 'Toggle Theme',
    'New Chat': 'New Chat',
    'New Workflow': 'New Workflow',

    // Settings
    'General': 'General',
    'Appearance': 'Appearance',
    'Models': 'Models',
    'Models Configuration': 'Models Configuration',
    'My Account': 'My Account',
    'Billing': 'Billing',
    'Save Settings': 'Save Settings',
    'Language': 'Language',
    'Theme': 'Theme',
    'System': 'System',
    'Light': 'Light',
    'Dark': 'Dark',
    'Manage global application settings.': 'Manage global application settings.',
    'Model Settings': 'Model Settings',
    'API Provider': 'API Provider',
    'Model Provider': 'Model Provider',
    'Local (Ollama/LM Studio)': 'Local (Ollama/LM Studio)',
    'Custom Endpoint': 'Custom Endpoint',
    'Custom API Base URL': 'Custom API Base URL',
    'Custom Model ID': 'Custom Model ID',
    'Custom API Protocol': 'Custom API Protocol',
    'OpenAI Compatible': 'OpenAI Compatible',
    'OpenAI Response': 'OpenAI Response',
    'OpenAI Completions': 'OpenAI Completions',
    'Anthropic': 'Anthropic',
    'Protocol': 'Protocol',
    'Base URL': 'Base URL',
    'Model ID': 'Model ID',
    'Theme Preference': 'Theme Preference',

    // Agents
    'Create Agent': 'Create Agent',
    'Manage and configure your AI assistants.': 'Manage and configure your AI assistants.',
    'Select an agent from the sidebar or create a new one.': 'Select an agent from the sidebar or create a new one.',
    'Name': 'Name',
    'Description': 'Description',
    'Avatar URL (Optional)': 'Avatar URL (Optional)',
    'Industry': 'Industry',
    'System Prompt': 'System Prompt',
    'Model Configuration': 'Model Configuration',
    'Advanced Parameters': 'Advanced Parameters',
    'Temperature': 'Temperature',
    'Max Tokens (Optional)': 'Max Tokens (Optional)',
    'Save Changes': 'Save Changes',
    'Edit Agent Configuration': 'Edit Agent Configuration',
    'Test Chat': 'Test Chat',
    'Select Industry': 'Select Industry',
    'Select a provider': 'Select a provider',
    'Technology': 'Technology',
    'Edit Agent': 'Edit Agent',
    'Create New Agent': 'Create New Agent',
    'Healthcare': 'Healthcare',
    'Finance': 'Finance',
    'Education': 'Education',
    'Creative': 'Creative',
    'No agents found. Create a new one to get started.': 'No agents found. Create a new one to get started.',

    // Workflows
    '+ Add Node...': '+ Add Node...',
    'Save Workflow': 'Save Workflow',
    'Trigger Node': 'Trigger Node',
    'Agent Node': 'Agent Node',
    'Condition Node': 'Condition Node',
    'SubWorkflow Node': 'SubWorkflow Node',
    'Action Node': 'Action Node',
    'Data Transformation Node': 'Data Transformation Node',
    'Output Node': 'Output Node',
    'Workflow saved successfully!': 'Workflow saved successfully!',
    'Configure in sidebar': 'Configure in sidebar',
    'Delete': 'Delete'
  },
  zh: {
    // Layout & Navigation
    'Chats': '聊天',
    'Workflows': '工作流',
    'Agents': '智能体',
    'Prompts': '提示词',
    'System Prompts': '系统提示词',
    'Saved Templates': '保存的模板',
    'Settings': '设置',
    'Profile': '个人主页',
    'Toggle Theme': '切换主题',
    'New Chat': '新聊天',
    'New Workflow': '新工作流',

    // Settings
    'General': '通用',
    'Appearance': '外观',
    'Models': '模型',
    'Models Configuration': '模型配置',
    'My Account': '我的账户',
    'Billing': '账单',
    'Save Settings': '保存设置',
    'Language': '语言',
    'Theme': '主题',
    'System': '跟随系统',
    'Light': '浅色',
    'Dark': '深色',
    'Manage global application settings.': '管理全局应用设置。',
    'Model Settings': '模型设置',
    'API Provider': 'API 服务商',
    'Model Provider': '模型服务商',
    'Local (Ollama/LM Studio)': '本地 (Ollama/LM Studio)',
    'Custom Endpoint': '自定义端点',
    'Custom API Base URL': '自定义 API Base URL',
    'Custom Model ID': '自定义模型 ID',
    'Custom API Protocol': '自定义 API 协议',
    'OpenAI Compatible': 'OpenAI 兼容',
    'OpenAI Response': 'OpenAI 响应',
    'OpenAI Completions': 'OpenAI 自动补全',
    'Anthropic': 'Anthropic',
    'Protocol': '协议',
    'Base URL': 'Base URL',
    'Model ID': '模型 ID',
    'Theme Preference': '主题偏好',

    // Agents
    'Create Agent': '创建智能体',
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
    'Healthcare': '医疗',
    'Finance': '金融',
    'Education': '教育',
    'Creative': '创意',
    'No agents found. Create a new one to get started.': '没有找到智能体。创建一个新的以开始。',

    // Workflows
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
    'Delete': '删除'
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
