import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/utils/cn";
import { Link, type LinkProps, useNavigate } from "react-router-dom";

const TooltipProvider = TooltipPrimitive.Provider;

const Tooltip = TooltipPrimitive.Root;

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = ({
  className,
  sideOffset = 4,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>) => (
  <TooltipPrimitive.Content
    sideOffset={sideOffset}
    className={cn(
      "z-50 max-w-xs overflow-hidden rounded-md bg-gray-900 px-3 py-2 text-sm text-white shadow-lg animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
);
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

// Component for handling links within tooltips
interface TooltipLinkProps extends LinkProps {
  className?: string;
  external?: boolean;
}

const TooltipLink = ({
  to,
  className,
  external,
  children,
  onClick,
  ...props
}: TooltipLinkProps) => {
  const navigate = useNavigate();

  const handleInteraction = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (onClick) {
      onClick(e as any);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.stopPropagation();
    if (external) {
      window.open(to.toString(), "_blank", "noopener,noreferrer");
    } else {
      navigate(to);
    }
  };

  const linkProps = {
    className: cn(
      "text-primary-300 hover:text-primary-200 underline font-medium",
      className
    ),
    onClick: handleInteraction,
    onTouchStart: handleInteraction,
    onTouchEnd: handleTouchEnd,
    ...props,
  };

  if (external) {
    return (
      <a
        href={to.toString()}
        target="_blank"
        rel="noopener noreferrer"
        {...linkProps}
      >
        {children}
      </a>
    );
  }

  return (
    <Link to={to} {...linkProps}>
      {children}
    </Link>
  );
};

TooltipLink.displayName = "TooltipLink";

// Controlled tooltip component that handles its own state
interface ControlledTooltipProps extends React.ComponentProps<typeof Tooltip> {
  children: [React.ReactElement, React.ReactElement]; // Enforce exactly two children: trigger and content
  triggerAsChild?: boolean;
  onOpenChange?: (open: boolean) => void;
}

const ControlledTooltip = ({
  children: [trigger, content],
  triggerAsChild = true,
  onOpenChange,
  ...props
}: ControlledTooltipProps) => {
  // Slightly funky state management to ensure the tooltip is toggled when the trigger is clicked.
  // This is necessary for mobile as Radix's Tooltip component doesn't support touch events.
  // TODO: Find a better way to handle this.
  const [isOpen, setIsOpen] = React.useState(false);
  const [isOpenFromTrigger, setIsOpenFromTrigger] = React.useState(false);

  const handleOpenChange = (open: boolean) => {
    // This timeout is needed for content links to work, otherwise the tooltip
    // will immediately close in response to the blur event on the trigger
    setTimeout(() => {
      setIsOpen(open);
      onOpenChange?.(open);
      if (!open) {
        setIsOpenFromTrigger(false);
      }
    }, 0);
  };

  const handleTriggerClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const newIsOpen = !isOpenFromTrigger;
    setIsOpenFromTrigger(newIsOpen);
    handleOpenChange(newIsOpen);
  };

  return (
    <Tooltip open={isOpen} onOpenChange={handleOpenChange} {...props}>
      <TooltipTrigger asChild={triggerAsChild} onClick={handleTriggerClick}>
        {trigger}
      </TooltipTrigger>
      {content}
    </Tooltip>
  );
};

ControlledTooltip.displayName = "ControlledTooltip";

export {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
  TooltipLink,
  ControlledTooltip,
};
