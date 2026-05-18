package com.seapower.wiki.service;

import com.seapower.wiki.model.Briefing;
import org.springframework.stereotype.Service;
import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

/**
 * Parses the game's WPF XAML briefing files into a flat grid+cells model the
 * frontend can render as a CSS grid. We deliberately don't try to be a full
 * XAML interpreter — just the subset Sea Power actually uses:
 *
 * <ul>
 *   <li>A root {@code <Grid>} with {@code Grid.RowDefinitions} and {@code Grid.ColumnDefinitions}</li>
 *   <li>{@code <TextBlock>} children placed via {@code Grid.Row} / {@code Grid.Column} / {@code Grid.ColumnSpan} / {@code Grid.RowSpan}</li>
 *   <li>{@code <LineBreak/>} inside TextBlock content (rendered as "\n")</li>
 *   <li>{@code <Image>} children with a {@code Source} binding string</li>
 * </ul>
 *
 * Anything else (animations, triggers, ResourceDictionary, ContextMenu) is
 * ignored. Comments and the {@code xmlns} cruft come out of the DOM parser
 * cleanly without us doing anything special.
 */
@Service
public class BriefingParser {

    /** Returns null if the file doesn't exist or fails to parse — callers
     *  treat that as "no briefing", not an error. We let readAllBytes raise
     *  NoSuchFileException (subclass of IOException) instead of a separate
     *  pre-check to avoid the TOCTOU window. */
    public Briefing parseFile(Path path) {
        if (path == null) return null;
        try {
            return parseBytes(Files.readAllBytes(path));
        } catch (IOException e) {
            return null;
        }
    }

    Briefing parseBytes(byte[] bytes) {
        try {
            DocumentBuilderFactory dbf = DocumentBuilderFactory.newInstance();
            dbf.setNamespaceAware(false);  // we don't care about xmlns prefixes
            // Disable external DTD lookups so the parser doesn't try to fetch anything off-disk.
            dbf.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
            dbf.setFeature("http://xml.org/sax/features/external-general-entities", false);
            dbf.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
            DocumentBuilder db = dbf.newDocumentBuilder();
            Document doc = db.parse(new ByteArrayInputStream(bytes));
            Element root = doc.getDocumentElement();
            if (root == null) return null;
            return walkGrid(root);
        } catch (ParserConfigurationException | SAXException | IOException e) {
            return null;
        }
    }

    private Briefing walkGrid(Element grid) {
        List<String> rows = collectTrackSizes(grid, "Grid.RowDefinitions", "RowDefinition", "Height");
        List<String> cols = collectTrackSizes(grid, "Grid.ColumnDefinitions", "ColumnDefinition", "Width");
        List<Briefing.Cell> cells = new ArrayList<>();
        NodeList children = grid.getChildNodes();
        for (int i = 0; i < children.getLength(); i++) {
            Node n = children.item(i);
            if (n.getNodeType() != Node.ELEMENT_NODE) continue;
            Element e = (Element) n;
            String name = localName(e);
            switch (name) {
                case "TextBlock" -> {
                    Briefing.Cell c = textBlockCell(e);
                    if (c != null) cells.add(c);
                }
                case "Image" -> cells.add(imageCell(e));
                default -> { /* skip — Grid.RowDefinitions etc. handled above */ }
            }
        }
        return new Briefing(rows, cols, cells);
    }

    private List<String> collectTrackSizes(Element grid, String wrapperName,
                                            String defName, String attrName) {
        List<String> out = new ArrayList<>();
        // Find the wrapper child (e.g. <Grid.RowDefinitions>).
        NodeList children = grid.getChildNodes();
        Element wrapper = null;
        for (int i = 0; i < children.getLength(); i++) {
            Node n = children.item(i);
            if (n.getNodeType() != Node.ELEMENT_NODE) continue;
            if (wrapperName.equals(localName((Element) n))) {
                wrapper = (Element) n;
                break;
            }
        }
        if (wrapper == null) return out;
        NodeList defs = wrapper.getChildNodes();
        for (int i = 0; i < defs.getLength(); i++) {
            Node n = defs.item(i);
            if (n.getNodeType() != Node.ELEMENT_NODE) continue;
            Element d = (Element) n;
            if (!defName.equals(localName(d))) continue;
            String size = attr(d, attrName);
            out.add(size == null || size.isEmpty() ? "Auto" : size);
        }
        return out;
    }

    private Briefing.Cell textBlockCell(Element tb) {
        String text = extractInlineText(tb);
        if (text != null) text = text.strip();
        // Pull positional attrs (default 0 if missing — XAML default).
        int row = parseIntAttr(tb, "Grid.Row", 0);
        int col = parseIntAttr(tb, "Grid.Column", 0);
        int rs  = parseIntAttr(tb, "Grid.RowSpan", 1);
        int cs  = parseIntAttr(tb, "Grid.ColumnSpan", 1);
        String hAlign = attr(tb, "HorizontalAlignment");
        String vAlign = attr(tb, "VerticalAlignment");
        String fontSize = normalizeFontSize(attr(tb, "FontSize"));
        boolean wrap = "Wrap".equalsIgnoreCase(attr(tb, "TextWrapping"));
        return new Briefing.Cell(row, col, rs, cs, text == null ? "" : text,
                hAlign, vAlign, fontSize, wrap, false, null);
    }

    private Briefing.Cell imageCell(Element img) {
        int row = parseIntAttr(img, "Grid.Row", 0);
        int col = parseIntAttr(img, "Grid.Column", 0);
        int rs  = parseIntAttr(img, "Grid.RowSpan", 1);
        int cs  = parseIntAttr(img, "Grid.ColumnSpan", 1);
        String hAlign = attr(img, "HorizontalAlignment");
        String vAlign = attr(img, "VerticalAlignment");
        String src = attr(img, "Source");
        return new Briefing.Cell(row, col, rs, cs, "", hAlign, vAlign,
                null, false, true, src);
    }

    /**
     * Walk a TextBlock's children, concatenating text nodes and the explicit
     * {@code Text=} attribute, converting {@code <LineBreak/>} into "\n".
     * XAML also lets you set the visible text via a {@code Text=} attribute —
     * either form is valid.
     */
    private String extractInlineText(Element tb) {
        String attrText = attr(tb, "Text");
        if (attrText != null && !attrText.isEmpty()) return attrText;
        StringBuilder sb = new StringBuilder();
        NodeList kids = tb.getChildNodes();
        for (int i = 0; i < kids.getLength(); i++) {
            Node n = kids.item(i);
            if (n.getNodeType() == Node.TEXT_NODE) {
                sb.append(n.getTextContent());
            } else if (n.getNodeType() == Node.ELEMENT_NODE) {
                Element e = (Element) n;
                String name = localName(e);
                if ("LineBreak".equalsIgnoreCase(name)) {
                    sb.append('\n');
                } else {
                    // Nested Run/Span/etc. — just descend and pull text.
                    sb.append(extractInlineText(e));
                }
            }
        }
        return sb.toString();
    }

    /** "{StaticResource Font.Size.Header}" → "Header"; bare numerics pass through. */
    private static String normalizeFontSize(String raw) {
        if (raw == null) return null;
        String r = raw.trim();
        if (r.startsWith("{") && r.endsWith("}")) {
            // Try to extract last dot-segment of the resource key.
            int dot = r.lastIndexOf('.');
            int closeBrace = r.lastIndexOf('}');
            if (dot > 0 && closeBrace > dot) return r.substring(dot + 1, closeBrace).trim();
            return r; // give up — return as-is
        }
        return r;
    }

    private static String localName(Element e) {
        String n = e.getNodeName();
        int colon = n.indexOf(':');
        return colon < 0 ? n : n.substring(colon + 1);
    }

    private static String attr(Element e, String name) {
        String v = e.getAttribute(name);
        return v.isEmpty() ? null : v;
    }

    private static int parseIntAttr(Element e, String name, int def) {
        String v = attr(e, name);
        if (v == null) return def;
        try { return Integer.parseInt(v.trim()); }
        catch (NumberFormatException ex) { return def; }
    }
}
