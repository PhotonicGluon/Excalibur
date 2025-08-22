package com.excalibur.app;

import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.DocumentsContract;
import android.util.Log;

import androidx.annotation.RequiresApi;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.io.File;

/**
 * A Capacitor plugin to open a specific folder in the device's file explorer.
 * <p>
 * This plugin specifically targets the app's custom folder within the public Documents directory
 * and uses a content URI to ensure compatibility.
 * <p>
 * Requires Android 11 (API 30) or higher.
 */
@RequiresApi(api=Build.VERSION_CODES.R)
@CapacitorPlugin(name = "FolderOpener")
public class FolderOpenerPlugin extends Plugin {
    private static final String TAG = "FolderOpenerPlugin";
    private static final String EXCALIBUR_FOLDER = "/Excalibur";

    /**
     * Opens the Excalibur documents folder in a file explorer app.
     * <p>
     * It ensures the folder exists, then creates an {@link Intent#ACTION_VIEW} intent with a 
     * {@link DocumentsContract} URI to request that the system open the folder. The call is
     * rejected if the folder cannot be created or if no app can handle the intent.
     *
     * @param call The plugin call object used to resolve or reject the request
     * @apiNote `call` does not take in any inputs. It will resolve to an object with a `opened`
     *         boolean value, indicating whether the folder was successfully opened.
     */
    @PluginMethod
    public void openDocumentsFolder(PluginCall call) {
        Log.d(TAG, "openDocumentsFolder() called");

        // Ensure that the Excalibur documents folder exists
        File targetFolder = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), EXCALIBUR_FOLDER);
        if (!targetFolder.exists()) {
            Log.d(TAG, "Excalibur documents folder does not yet exist... creating it");
            if (!targetFolder.mkdirs()) {
                String errorMsg = "Failed to create folder";
                Log.e(TAG, errorMsg);
                call.reject(errorMsg);
                return;
            }
        }
        Log.d(TAG, "Absolute path: " + targetFolder.getAbsolutePath());

        // Build a special URI that points to that folder
        // This is not a file path URI but a content URI that the system's file picker understands
        String docId = "primary:Documents" + EXCALIBUR_FOLDER;
        Uri initialUri = DocumentsContract.buildDocumentUri("com.android.externalstorage.documents", docId);

        // Create an intent to view the folder
        Intent intent = new Intent(Intent.ACTION_VIEW);
        intent.setDataAndType(initialUri, "*/*");

        // Verify intent resolves to an activity
        if (intent.resolveActivity(getContext().getPackageManager()) != null) {
            try {
                getContext().startActivity(Intent.createChooser(intent, "Open Folder With"));
                JSObject res = new JSObject();
                res.put("opened", true);
                call.resolve(res);
                return;
            } catch (android.content.ActivityNotFoundException ignored) {
                // We will handle the error in the code after this
            }
        }

        String errorMsg = "No app found to open a folder";
        Log.e(TAG, errorMsg);
        call.reject(errorMsg);
    }
}
