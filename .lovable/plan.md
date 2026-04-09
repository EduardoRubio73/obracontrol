

## Plan: Move sidebar trigger into the sidebar

### What changes
1. **Remove** the `<SidebarTrigger>` from the header in `AppLayout.tsx` (line 66)
2. **Add** a collapse/expand toggle button at the bottom of the sidebar in `AppSidebar.tsx`, above the "Sair" button in the footer, using the `PanelLeft` icon from lucide-react (matches the icon style shown in the reference image)

### Files to edit
- **`src/components/AppLayout.tsx`** — Delete the `<SidebarTrigger className="hidden md:flex" />` line
- **`src/components/AppSidebar.tsx`** — Import `PanelLeft` icon and `useSidebar`'s `toggleSidebar`, add a menu item in the footer that calls `toggleSidebar` with the `PanelLeft` icon

