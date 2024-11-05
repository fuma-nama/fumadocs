import {
  Sidebar,
  SidebarFooter,
  SidebarHeader,
  SidebarList,
  SidebarViewport,
} from '@/layouts/docs/sidebar';

export function Layout() {
  return (
    <>
      <Sidebar>
        <SidebarHeader></SidebarHeader>
        <SidebarViewport>
          <SidebarList />
        </SidebarViewport>
        <SidebarFooter />
      </Sidebar>
    </>
  );
}
