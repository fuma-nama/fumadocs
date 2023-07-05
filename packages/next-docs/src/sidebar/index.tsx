import {
    ElementType,
    ReactNode,
    createContext,
    useContext,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { usePathname } from "next/navigation";
import { RemoveScroll } from "react-remove-scroll";
import { WithAs } from "@/types";

const SidebarContext = createContext({
    open: false,
    setOpen: (_: boolean) => {},
});

export type SidebarProviderProps = {
    open?: boolean;
    onOpenChange?: (v: boolean) => void;
    children: ReactNode;
};

export function SidebarProvider(props: SidebarProviderProps) {
    const [open, setOpen] =
        props.open == null
            ? useState(false)
            : [props.open, props.onOpenChange!!];
    const pathname = usePathname();

    useEffect(() => {
        setOpen(false);
    }, [pathname]);

    return (
        <SidebarContext.Provider value={{ open, setOpen }}>
            {props.children}
        </SidebarContext.Provider>
    );
}

export type SidebarTriggerProps<T extends ElementType> = WithAs<T>;

export function SidebarTrigger<T extends ElementType = "button">({
    as,
    ...props
}: SidebarTriggerProps<T>) {
    const { open, setOpen } = useContext(SidebarContext);
    const As = as ?? "button";

    return <As data-open={open} onClick={() => setOpen(!open)} {...props} />;
}

export type SidebarContentProps<T extends ElementType> = WithAs<
    T,
    {
        minWidth?: number;
    }
>;

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

export type SidebarCollapsiableProps<T extends ElementType> = WithAs<
    T,
    {
        open: boolean;
        /**
         * Name of the css property for animating the height, default: --item-height
         */
        heightProperty?: string;
    }
>;

export function SidebarCollapsible<T extends ElementType = "div">({
    as,
    open,
    heightProperty = "--item-height",
    ...props
}: SidebarCollapsiableProps<T>) {
    const As = as || "div";
    const ref = useRef<HTMLElement | null>(null);
    const originalStylesRef = useRef<Record<string, string>>();
    const isMountAnimationPreventedRef = useRef(true);

    useEffect(() => {
        const rAF = requestAnimationFrame(
            () => (isMountAnimationPreventedRef.current = false)
        );
        return () => cancelAnimationFrame(rAF);
    }, []);

    useLayoutEffect(() => {
        const node = ref.current;
        if (node == null) return;

        if (isMountAnimationPreventedRef.current) {
            originalStylesRef.current = originalStylesRef.current || {
                transitionDuration: node.style.transitionDuration,
                animationName: node.style.animationName,
            };

            node.style.transitionDuration = "0s";
            node.style.animationName = "none";
        } else if (originalStylesRef.current != null) {
            node.style.transitionDuration =
                originalStylesRef.current.transitionDuration;
            node.style.animationName = originalStylesRef.current.animationName;
        }

        node.style.setProperty(heightProperty, `${node.scrollHeight}px`);
    }, [open]);

    return <As ref={ref as any} {...props} />;
}
