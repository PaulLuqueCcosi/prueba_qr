import { useAuth0 } from '@auth0/auth0-react'
import { Grid2x2, LogIn, LogOut } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'
import { VIEWS, type ViewId } from '@/lib/views'

interface AppSidebarProps {
  current: ViewId
  onNavigate: (view: ViewId) => void
}

const GROUPS = ['tools', 'developer'] as const

export function AppSidebar({ current, onNavigate }: AppSidebarProps) {
  const { t } = useTranslation()
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } =
    useAuth0()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none">
              <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-8 shrink-0 items-center justify-center rounded-lg">
                <Grid2x2 aria-hidden />
              </div>
              <div className="grid flex-1 text-left leading-tight">
                <span className="truncate font-semibold">{t('app.name')}</span>
                <span className="text-sidebar-foreground/70 truncate text-xs">
                  {t('app.tagline')}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        {GROUPS.map((group) => (
          <SidebarGroup key={group}>
            <SidebarGroupLabel>{t(`sidebar.${group}`)}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {VIEWS.filter((view) => view.group === group).map((view) => (
                  <SidebarMenuItem key={view.id}>
                    <SidebarMenuButton
                      tooltip={t(`views.${view.id}.label`)}
                      isActive={current === view.id}
                      aria-current={current === view.id ? 'page' : undefined}
                      disabled={!isAuthenticated}
                      onClick={() => onNavigate(view.id)}
                    >
                      <view.icon aria-hidden />
                      <span>{t(`views.${view.id}.label`)}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        {isAuthenticated ? (
          <div className="flex items-center gap-2 p-1 group-data-[collapsible=icon]:justify-center">
            <Avatar size="sm">
              <AvatarImage src={user?.picture} alt="" />
              <AvatarFallback>
                {(user?.name ?? '?').slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="grid min-w-0 flex-1 leading-tight group-data-[collapsible=icon]:hidden">
              <span className="truncate text-sm font-medium">{user?.name}</span>
              <span className="text-sidebar-foreground/70 truncate text-xs">
                {user?.email}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label={t('sidebar.logout')}
              title={t('sidebar.logout')}
              className="group-data-[collapsible=icon]:hidden"
              onClick={() =>
                void logout({
                  logoutParams: { returnTo: window.location.origin },
                })
              }
            >
              <LogOut aria-hidden />
            </Button>
          </div>
        ) : (
          <Button
            disabled={isLoading}
            aria-label={t('sidebar.login')}
            onClick={() => void loginWithRedirect()}
          >
            <LogIn aria-hidden />
            <span className="group-data-[collapsible=icon]:hidden">
              {t('sidebar.login')}
            </span>
          </Button>
        )}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
