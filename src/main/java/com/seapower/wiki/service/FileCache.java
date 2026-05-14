package com.seapower.wiki.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.attribute.FileTime;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;
import java.util.function.Function;

/**
 * mtime-keyed cache. When the file on disk changes (after a game patch or mod edit),
 * the next read auto-invalidates its cached entry. Safe for concurrent reads.
 */
public class FileCache<T> {
    private final Function<Path, T> loader;
    private final boolean enabled;
    private final ConcurrentMap<Path, Entry<T>> store = new ConcurrentHashMap<>();

    public FileCache(Function<Path, T> loader, boolean enabled) {
        this.loader = loader;
        this.enabled = enabled;
    }

    public T get(Path path) {
        if (!enabled) {
            return loader.apply(path);
        }
        FileTime mtime;
        try {
            mtime = Files.getLastModifiedTime(path);
        } catch (IOException e) {
            throw new RuntimeException("Cannot stat " + path, e);
        }
        Entry<T> existing = store.get(path);
        if (existing != null && existing.mtime.equals(mtime)) {
            return existing.value;
        }
        T value = loader.apply(path);
        store.put(path, new Entry<>(value, mtime));
        return value;
    }

    public void clear() { store.clear(); }

    private record Entry<V>(V value, FileTime mtime) {}
}
