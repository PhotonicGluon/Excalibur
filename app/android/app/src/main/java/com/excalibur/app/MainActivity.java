package com.excalibur.app;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

import java.util.List;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugins(List.of(FolderOpenerPlugin.class));
        super.onCreate(savedInstanceState);
    }
}
