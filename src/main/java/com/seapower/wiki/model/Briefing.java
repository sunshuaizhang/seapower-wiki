package com.seapower.wiki.model;

import java.util.List;

/**
 * Structured representation of a mission briefing parsed from WPF XAML
 * ({@code BriefingText_<lang>.xml}). Frontend renders this as a CSS grid so the
 * original "teletype message" layout (left column for headers, right column
 * for content, spacer rows between message blocks) is preserved.
 *
 * <p>Row and column track lists hold their raw XAML sizing strings
 * ("Auto", "*", "10") — frontend maps them to CSS values (auto / 1fr / 10px).
 */
public record Briefing(
        List<String> rowTracks,
        List<String> colTracks,
        List<Cell> cells
) {
    public record Cell(
            int row,
            int col,
            int rowSpan,
            int colSpan,
            /** Plain text content with LineBreaks rendered as "\n". Empty for image cells. */
            String text,
            /** "Left" / "Center" / "Right" / "Stretch" — null if unset. */
            String hAlign,
            /** Same as hAlign for vertical. */
            String vAlign,
            /** Tag from FontSize="{StaticResource Font.Size.Header}" → "Header".
             *  Numeric values pass through unchanged. */
            String fontSize,
            /** TextWrapping="Wrap" was set. */
            boolean wrap,
            /** When true, the cell is an Image element rather than a TextBlock. */
            boolean isImage,
            /** Raw image binding expression, e.g. "{Binding Assets[ts_banner]}". */
            String imageBinding
    ) {}
}
