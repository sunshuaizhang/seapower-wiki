package com.seapower.wiki.parser;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Parsed INI file. Preserves section insertion order.
 * A section's values() list retains duplicate-key entries (needed for squadron files).
 */
public class IniDocument {
    private final Map<String, IniSection> sections = new LinkedHashMap<>();

    public IniSection section(String name) {
        return sections.get(name);
    }

    public IniSection getOrCreate(String name) {
        return sections.computeIfAbsent(name, IniSection::new);
    }

    public Map<String, IniSection> sections() {
        return sections;
    }

    public boolean has(String name) {
        return sections.containsKey(name);
    }

    public static class IniSection {
        private final String name;
        private final Map<String, String> map = new LinkedHashMap<>();
        private final List<String[]> entries = new ArrayList<>();

        public IniSection(String name) {
            this.name = name;
        }

        public String getName() { return name; }

        public void put(String key, String value) {
            map.put(key, value);
            entries.add(new String[]{key, value});
        }

        public String get(String key) { return map.get(key); }

        public String get(String key, String defVal) {
            return map.getOrDefault(key, defVal);
        }

        public int getInt(String key, int defVal) {
            String v = map.get(key);
            if (v == null) return defVal;
            try { return Integer.parseInt(v.trim()); } catch (Exception e) { return defVal; }
        }

        public double getDouble(String key, double defVal) {
            String v = map.get(key);
            if (v == null) return defVal;
            try { return Double.parseDouble(v.trim()); } catch (Exception e) { return defVal; }
        }

        public Map<String, String> map() { return map; }

        public List<String[]> entries() { return entries; }
    }
}
