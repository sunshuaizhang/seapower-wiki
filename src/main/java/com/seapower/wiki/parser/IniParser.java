package com.seapower.wiki.parser;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Sea Power INI parser. Handles:
 *  - BOM at file start
 *  - // and # comments, both full-line and inline (e.g. {@code Length=173  // in meters})
 *  - Decorative section headers like {@code [---------- Weapon Systems ----------]} (skipped)
 *  - Stars/markdown-like banners such as {@code [****** All nations ******]} (skipped)
 *  - Inline trailing text after a closing bracket (e.g. {@code [Squadron1]  Atlantic Airlines}) is dropped
 *  - Duplicate keys within a section are preserved in the entries() list
 */
public class IniParser {

    /** A section name is "decorative" (a pure visual separator) if, after stripping symbols, nothing meaningful remains. */
    private static final Pattern DECORATIVE = Pattern.compile("^[\\-\\*\\s=_.]+$");

    public static IniDocument parse(Path path) throws IOException {
        List<String> lines = Files.readAllLines(path, StandardCharsets.UTF_8);
        return parseLines(lines);
    }

    public static IniDocument parseLines(List<String> lines) {
        IniDocument doc = new IniDocument();
        IniDocument.IniSection current = null;
        boolean first = true;

        for (String raw : lines) {
            String line = raw;
            if (first) {
                first = false;
                if (!line.isEmpty() && line.charAt(0) == '﻿') {
                    line = line.substring(1); // strip BOM
                }
            }

            String stripped = line.strip();
            if (stripped.isEmpty()) continue;
            if (stripped.startsWith("#") || stripped.startsWith("//") || stripped.startsWith(";")) continue;

            if (stripped.startsWith("[")) {
                int end = stripped.indexOf(']');
                if (end < 0) continue;
                String name = stripped.substring(1, end).strip();
                // Strip leading/trailing decorative runs like "---------- Foo ----------"
                String cleaned = name.replaceAll("^[\\-\\*=_\\s]+", "").replaceAll("[\\-\\*=_\\s]+$", "").strip();
                if (cleaned.isEmpty() || DECORATIVE.matcher(name).matches()) {
                    current = null; // decorative — ignore following keys until a real section appears
                    continue;
                }
                current = doc.getOrCreate(cleaned);
                continue;
            }

            if (current == null) continue;

            int eq = stripped.indexOf('=');
            if (eq < 0) continue;
            String key = stripped.substring(0, eq).strip();
            String value = stripped.substring(eq + 1);
            value = stripInlineComment(value).strip();
            if (key.isEmpty()) continue;
            current.put(key, value);
        }
        return doc;
    }

    /**
     * Strip inline // or # comments from a value, but only when they are not embedded inside a path/URL.
     * Simple rule: if the comment marker appears with whitespace before it (or at the start), cut there.
     * {@code audio/ships/Ship-Turbine} should NOT be truncated at //.
     */
    static String stripInlineComment(String value) {
        int hash = findStandaloneMarker(value, '#');
        int slash = findDoubleSlashComment(value);
        int cut = -1;
        if (hash >= 0) cut = hash;
        if (slash >= 0 && (cut < 0 || slash < cut)) cut = slash;
        return cut < 0 ? value : value.substring(0, cut);
    }

    private static int findStandaloneMarker(String s, char marker) {
        for (int i = 0; i < s.length(); i++) {
            if (s.charAt(i) == marker) {
                if (i == 0 || Character.isWhitespace(s.charAt(i - 1))) return i;
            }
        }
        return -1;
    }

    private static int findDoubleSlashComment(String s) {
        for (int i = 0; i < s.length() - 1; i++) {
            if (s.charAt(i) == '/' && s.charAt(i + 1) == '/') {
                if (i == 0 || Character.isWhitespace(s.charAt(i - 1))) return i;
            }
        }
        return -1;
    }
}
