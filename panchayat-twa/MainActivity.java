package in.techgaon.panchayatai;

import android.app.Activity;
import android.content.ComponentName;
import android.content.Intent;
import android.content.pm.ResolveInfo;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.view.Gravity;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;
import androidx.browser.customtabs.CustomTabsClient;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.browser.customtabs.CustomTabsServiceConnection;
import androidx.browser.customtabs.CustomTabsSession;
import androidx.browser.trusted.TrustedWebActivityIntent;
import androidx.browser.trusted.TrustedWebActivityIntentBuilder;
import java.util.Arrays;
import java.util.List;

/**
 * Panchayat AI v1.0.6: immediate full-screen launch with native fallback only
 * Trusted Web Activity (TWA) as the default, not a plain Custom Tab.
 * This keeps Chrome's Google/Firebase auth session intact.
 */
public class MainActivity extends Activity {
    private static final String TAG = "PanchayatAITWA";
    private static final String SITE = "https://techgaon.in/panchayatai/";
    private TextView status;
    private LinearLayout fallbackView;
    /** Only show the old native screen if the browser cannot launch. */
    private void showFallbackScreen() {
        if (fallbackView != null && !isFinishing()) {
            setContentView(fallbackView);
        }
    }
    private CustomTabsServiceConnection tabsConnection;
    private boolean tabsBound = false;
    private boolean launchPending = false;
    private long lastAttempt = 0L;

    private int dp(int n) {
        return (int) (n * getResources().getDisplayMetrics().density + 0.5f);
    }

    private TextView label(String text, int size, boolean bold, int color) {
        TextView view = new TextView(this);
        view.setText(text);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.CENTER);
        if (bold) view.setTypeface(null, Typeface.BOLD);
        return view;
    }

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().setStatusBarColor(Color.rgb(12, 73, 49));
        getWindow().setNavigationBarColor(Color.rgb(12, 73, 49));
        getWindow().getDecorView().setBackgroundColor(Color.rgb(247, 249, 247));

        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setPadding(dp(28), dp(30), dp(28), dp(30));
        root.setBackgroundColor(Color.rgb(247, 249, 247));
        root.addView(label("पं", 68, true, Color.rgb(13, 79, 51)),
                new LinearLayout.LayoutParams(-1, dp(110)));
        root.addView(label("पंचायत AI", 30, true, Color.rgb(13, 79, 51)),
                new LinearLayout.LayoutParams(-1, dp(60)));
        root.addView(label("उत्तर प्रदेश पंचायत कार्यों का डिजिटल सहायक",
                15, false, Color.rgb(95, 111, 101)),
                new LinearLayout.LayoutParams(-1, dp(70)));

        Button open = new Button(this);
        open.setText("पंचायत AI खोलें");
        open.setAllCaps(false);
        open.setTextSize(17);
        open.setTextColor(Color.WHITE);
        GradientDrawable background = new GradientDrawable();
        background.setColor(Color.rgb(13, 79, 51));
        background.setCornerRadius(dp(14));
        open.setBackground(background);
        LinearLayout.LayoutParams buttonParams = new LinearLayout.LayoutParams(-1, dp(56));
        buttonParams.topMargin = dp(16);
        root.addView(open, buttonParams);

        status = label("सुरक्षित Full-Screen ऐप खुल रहा है…",
                13, false, Color.rgb(95, 111, 101));
        LinearLayout.LayoutParams statusParams = new LinearLayout.LayoutParams(-1, dp(80));
        statusParams.topMargin = dp(12);
        root.addView(status, statusParams);
        // No intermediate page or delay on a successful app launch.
        fallbackView = root;
        open.setOnClickListener(v -> openSite());
        openSite();
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        Uri uri = intent == null ? null : intent.getData();
        if (uri != null && "panchayatai".equals(uri.getScheme()) &&
                "open".equals(uri.getHost())) {
            openSite();
        }
    }

    private void openSite() {
        if (launchPending || System.currentTimeMillis() - lastAttempt < 1200) return;
        lastAttempt = System.currentTimeMillis();
        launchPending = true;
        status.setText("Full-Screen पंचायत AI खोल रहे हैं…");

        try {
            String browser = CustomTabsClient.getPackageName(
                    this, Arrays.asList("com.android.chrome"));
            if (browser == null) {
                browser = CustomTabsClient.getPackageName(this, null);
            }
            if (browser == null || browser.equals(getPackageName())) {
                launchPending = false;
                openBrowserFallback();
                return;
            }

            // AndroidX's official TWA API requires a browser-backed session.
            final String chosenBrowser = browser;
            tabsConnection = new CustomTabsServiceConnection() {
                @Override
                public void onCustomTabsServiceConnected(ComponentName name,
                        CustomTabsClient client) {
                    try {
                        client.warmup(0);
                        CustomTabsSession session = client.newSession(null);
                        if (session == null) throw new IllegalStateException("No browser session");
                        TrustedWebActivityIntent twa = new TrustedWebActivityIntentBuilder(
                                Uri.parse(SITE)).build(session);
                        twa.getIntent().setPackage(chosenBrowser);
                        twa.launchTrustedWebActivity(MainActivity.this);
                        // Remove launcher activity from back stack after opening TWA.
                        finish();
                    } catch (Exception e) {
                        Log.w(TAG, "Trusted Web Activity launch failed", e);
                        openBrowserFallback();
                    } finally {
                        launchPending = false;
                    }
                }

                @Override
                public void onServiceDisconnected(ComponentName name) {
                    if (launchPending) {
                        launchPending = false;
                        status.setText("Chrome से कनेक्शन टूट गया। फिर से खोलें दबाएँ।");
                        showFallbackScreen();
                    }
                }
            };
            tabsBound = CustomTabsClient.bindCustomTabsService(this, chosenBrowser, tabsConnection);
            if (!tabsBound) {
                launchPending = false;
                openBrowserFallback();
            } else {
                // A browser service that never responds must not leave the UI stuck.
                new Handler(Looper.getMainLooper()).postDelayed(() -> {
                    if (launchPending && !isFinishing() && !isDestroyed()) {
                        launchPending = false;
                        status.setText("Chrome तैयार नहीं है। फिर से खोलें दबाएँ।");
                        showFallbackScreen();
                    }
                }, 7000);
            }
        } catch (Exception e) {
            Log.w(TAG, "Could not bind TWA service", e);
            launchPending = false;
            openBrowserFallback();
        }
    }

    private void openBrowserFallback() {
        Uri site = Uri.parse(SITE);
        try {
            String browser = CustomTabsClient.getPackageName(this, null);
            if (browser != null && !browser.equals(getPackageName())) {
                CustomTabsIntent tab = new CustomTabsIntent.Builder()
                        .setShowTitle(false)
                        .setToolbarColor(Color.rgb(13, 79, 51))
                        .build();
                tab.intent.setPackage(browser);
                tab.launchUrl(this, site);
                finish();
                return;
            }
        } catch (Exception e) {
            Log.w(TAG, "Custom Tab fallback failed", e);
        }
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, site);
            intent.addCategory(Intent.CATEGORY_BROWSABLE);
            List<ResolveInfo> handlers = getPackageManager().queryIntentActivities(intent, 0);
            for (ResolveInfo handler : handlers) {
                String pkg = handler.activityInfo == null ? null : handler.activityInfo.packageName;
                if (pkg == null || pkg.equals(getPackageName())) continue;
                intent.setPackage(pkg);
                startActivity(intent);
                finish();
                return;
            }
            status.setText("Chrome इंस्टॉल/अपडेट करके फिर खोलें दबाएँ।");
            showFallbackScreen();
        } catch (Exception e) {
            Log.e(TAG, "No browser available", e);
            status.setText("Browser नहीं खुल सका। Chrome अपडेट करें।");
            showFallbackScreen();
        }
    }

    @Override
    protected void onDestroy() {
        if (tabsBound && tabsConnection != null) {
            try { unbindService(tabsConnection); }
            catch (Exception ignored) { }
        }
        tabsBound = false;
        super.onDestroy();
    }
}
