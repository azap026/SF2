// assets
import { ChromeOutlined, QuestionOutlined, DatabaseOutlined } from '@ant-design/icons';

// icons
const icons = {
  ChromeOutlined,
  QuestionOutlined,
  DatabaseOutlined
};

// ==============================|| MENU ITEMS - SAMPLE PAGE & DOCUMENTATION ||============================== //

const support = {
  id: 'support',
  title: 'Поддержка',
  type: 'group',
  children: [
    {
      id: 'sample-page',
      title: 'Пример страницы',
      type: 'item',
      url: '/sample-page',
      icon: icons.ChromeOutlined
    },
    {
      id: 'database-test',
      title: 'Тест БД',
      type: 'item',
      url: '/database-test',
      icon: icons.DatabaseOutlined
    },
    {
      id: 'documentation',
      title: 'Документация',
      type: 'item',
      url: 'https://codedthemes.gitbook.io/mantis/',
      icon: icons.QuestionOutlined,
      external: true,
      target: true
    }
  ]
};

export default support;
