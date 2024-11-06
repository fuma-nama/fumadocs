import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarViewport,
} from '@/layouts/docs/sidebar';

export function Layout() {
  return (
    <>
      <Sidebar>
        <SidebarHeader></SidebarHeader>
        <SidebarViewport></SidebarViewport>
        <SidebarFooter />
      </Sidebar>
    </>
  );
}
