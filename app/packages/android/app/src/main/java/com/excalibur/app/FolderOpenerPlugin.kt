package com.excalibur.app

import android.content.ActivityNotFoundException
import android.content.Intent
import android.os.Environment
import android.provider.DocumentsContract
import android.util.Log
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import java.io.File

/**
 * A Capacitor plugin that opens the Excalibur folder in a file explorer app.
 * 
 * This plugin specifically targets the app's custom folder within the public Documents directory
 * and uses a content URI to ensure compatibility.
 */
@CapacitorPlugin(name = "FolderOpener")
class FolderOpenerPlugin : Plugin() {
    companion object {
        private const val TAG = "FolderOpenerPlugin"
        private const val EXCALIBUR_FOLDER = "Excalibur"
    }

    /**
     * Opens the Excalibur folder in a file explorer app.
     *
     * It ensures the folder exists, then creates an [Intent.ACTION_VIEW] intent with a
     * [DocumentsContract] URI to request that the system open the folder. The call is rejected if
     * the folder cannot be created or if no app can handle the intent.
     * 
     * @param call the plugin call object used to resolve or reject the request
     */
    @PluginMethod
    fun openExcaliburFolder(call: PluginCall) {
        Log.d(TAG, "openExcaliburFolder() called")

        // Ensure that the Excalibur folder exists
        val excaliburFolder = File(
            Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS),
            EXCALIBUR_FOLDER
        )
        if (!excaliburFolder.exists()) {
            Log.d(TAG, "Excalibur folder does not yet exist... creating it")
            if (!excaliburFolder.mkdirs()) {
                val errorMsg = "Failed to create folder"
                Log.e(TAG, errorMsg)
                call.reject(errorMsg)
                return
            }
        }
        
        Log.d(TAG, "Absolute path: " + excaliburFolder.absolutePath)

        // Build a special URI that points to that folder
        // This is not a file path URI but a content URI that the system's file picker understands
        val docId = "primary:Documents/$EXCALIBUR_FOLDER"
        val initialUri = DocumentsContract.buildDocumentUri("com.android.externalstorage.documents", docId)

        // Create an intent to view the folder
        val intent = Intent(Intent.ACTION_VIEW)
        intent.setDataAndType(initialUri, "*/*")

        // Verify intent resolves to an activity
        if (intent.resolveActivity(context.packageManager) != null) {
            try {
                context.startActivity(Intent.createChooser(intent, "Open Folder With"))
                call.resolve()
                return
            } catch (_: ActivityNotFoundException) {
                // We will handle the error in the code after this
            }
        }

        val errorMsg = "No app found to open a folder"
        Log.e(TAG, errorMsg)
        call.reject(errorMsg)
    }
}
