import 'fumadocs-ui/style.css';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { Inter } from 'next/font/google';
import { defineI18nUI } from 'fumadocs-ui/i18n';
import { i18n } from '@/lib/i18n';

const inter = Inter({
  subsets: ['latin'],
});

const { provider } = defineI18nUI(i18n, {
  translations: {
    en: {
      displayName: 'English',
    },
    cn: {
      displayName: 'Chinese',
      toc: '目錄',
      search: '搜尋文檔',
      lastUpdate: '最後更新於',
      searchNoResult: '沒有結果',
      previousPage: '上一頁',
      nextPage: '下一頁',
      chooseLanguage: '選擇語言',
    },
    vi: {
      displayName: 'Vietnamese',
      toc: 'Trên trang này',
      search: 'Tìm kiếm',
      lastUpdate: 'Cập nhật lần cuối vào',
      searchNoResult: 'Không tìm thấy kết quả',
      previousPage: 'Trang trước',
      nextPage: 'Trang tiếp',
      chooseLanguage: 'Chọn ngôn ngữ',
      chooseTheme: 'Giao diện',
      editOnGithub: 'Chỉnh sửa trên GitHub',
      tocNoHeadings: 'Không có tiêu đề',
    },
  },
});

export default async function Layout({ params, children }: LayoutProps<'/[lang]'>) {
  const { lang } = await params;
  return (
    <html lang={lang} className={inter.className} suppressHydrationWarning>
      <body
        style={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <RootProvider i18n={provider(lang)}>{children}</RootProvider>
      </body>
    </html>
  );
}
