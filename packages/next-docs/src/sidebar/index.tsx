import {
    ComponentPropsWithoutRef,
    ElementType,
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";
import { usePathname } from "next/navigation";
import { RemoveScroll } from "react-remove-scroll";

const SidebarContext = createContext({
    open: false,
    setOpen: (v: boolean) => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
    const [open, setOpen] = useState(false);
    const pathname = usePathname();

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <SidebarContext.Provider value={{ open, setOpen }}>
            {children}
        </SidebarContext.Provider>
    );
}

export function SidebarTrigger(props: ComponentPropsWithoutRef<"button">) {
    const { open, setOpen } = useContext(SidebarContext);

    return (
        <button data-open={open} onClick={() => setOpen(!open)} {...props} />
    );
}

export type SidebarContentProps<T extends ElementType> =
    ComponentPropsWithoutRef<T> & {
        /**
         * (in pixels) Always open when the viewport is wider than the min width
         */
        minWidth?: number;
        as?: T;
    };

export function SidebarList<T extends ElementType = "aside">({
    as,
    minWidth,
    ...props
}: SidebarContentProps<T>) {
    const { open } = useContext(SidebarContext);
    const [isMobileLayout, setIsMobileLayout] = useState(false);

    useEffect(() => {
        if (minWidth == null) return;
        const mediaQueryList = window.matchMedia(`(min-width: ${minWidth}px)`);

        const handleChange = () => setIsMobileLayout(!mediaQueryList.matches);
        handleChange();

        mediaQueryList.addEventListener("change", handleChange);
        return () => mediaQueryList.removeEventListener("change", handleChange);
    }, [minWidth]);

    return (
        <RemoveScroll
            as={as}
            data-open={isMobileLayout && open}
            enabled={isMobileLayout && open}
            {...props}
        >
            {props.children}
        </RemoveScroll>
    );
}
