"use client";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Copy, Check } from "lucide-react";
import { ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Typography } from "@/components/core/typography";

function TruncatedCell({
                           content,
                           copyIconVisible = true,
                       }: {
    content: ReactNode;
    copyIconVisible?: boolean;
}) {
    const ref = useRef<HTMLDivElement>(null);
    const [isTruncated, setIsTruncated] = useState(false);
    const [fullText, setFullText] = useState("");
    const [copied, setCopied] = useState(false);

    const checkTruncation = useCallback(() => {
        const el = ref.current;
        if (el) {
            setFullText(el.textContent || "");
            setIsTruncated(el.scrollWidth > el.clientWidth);
        }
    }, []);

    useEffect(() => {
        checkTruncation();
    }, [content, checkTruncation]);

    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const observer = new ResizeObserver(checkTruncation);
        observer.observe(el);
        return () => observer.disconnect();
    }, [checkTruncation, isTruncated]);

    const handleCopy = useCallback(() => {
        if (!fullText) return;
        navigator.clipboard.writeText(fullText).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 3000);
        });
    }, [fullText]);

    if (!isTruncated) {
        return (
            <div
                ref={ref}
                className="text-left w-full overflow-hidden text-ellipsis whitespace-nowrap"
            >
                {content}
            </div>
        );
    }

    return (
        <Tooltip>
            <TooltipTrigger>
                <div
                    ref={ref}
                    className="text-left w-full overflow-hidden text-ellipsis whitespace-nowrap cursor-default"
                >
                    {content}
                </div>
            </TooltipTrigger>
            <TooltipContent
                side="top"
                className="max-w-md"
            >
                <div className="flex items-start justify-between gap-2">
                    <Typography className="max-w-sm wrap-break-word whitespace-normal text-wrap">
                        {fullText}
                    </Typography>
                    {copyIconVisible && (
                        <button
                            onClick={handleCopy}
                            className="shrink-0 mt-0.5 text-white hover:text-white transition-colors"
                            aria-label="Copy to clipboard"
                        >
                            {copied ? (
                                <Check
                                    size={14}
                                    strokeWidth={3}
                                />
                            ) : (
                                <Copy
                                    size={14}
                                    strokeWidth={3}
                                />
                            )}
                        </button>
                    )}
                </div>
            </TooltipContent>
        </Tooltip>
    );
}

export default TruncatedCell;
