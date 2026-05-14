package com.seapower.wiki.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "images")
public class ImageConfig {
    private boolean enabled = true;
    private String cacheDir;
    private String pythonBin = "python";
    private String script = "scripts/unity_extractor.py";
    private int startupTimeoutSec = 60;
    private int requestTimeoutSec = 30;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getCacheDir() { return cacheDir; }
    public void setCacheDir(String cacheDir) { this.cacheDir = cacheDir; }
    public String getPythonBin() { return pythonBin; }
    public void setPythonBin(String pythonBin) { this.pythonBin = pythonBin; }
    public String getScript() { return script; }
    public void setScript(String script) { this.script = script; }
    public int getStartupTimeoutSec() { return startupTimeoutSec; }
    public void setStartupTimeoutSec(int v) { this.startupTimeoutSec = v; }
    public int getRequestTimeoutSec() { return requestTimeoutSec; }
    public void setRequestTimeoutSec(int v) { this.requestTimeoutSec = v; }
}
