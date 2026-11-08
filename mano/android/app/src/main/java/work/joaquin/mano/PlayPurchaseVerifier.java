package work.joaquin.mano;

import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PublicKey;
import java.security.Signature;
import java.security.interfaces.RSAPublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/** Local authenticity check of Play's original signed bytes. No receipt upload,
 * token logging, test bypass or private signing key belongs in this class.
 * A modified client can bypass local code: this is not server verification.
 */
public final class PlayPurchaseVerifier {
    private final PublicKey key;
    public PlayPurchaseVerifier(String encodedPublicKey) {
        PublicKey parsed = null;
        try {
            if (encodedPublicKey != null && !encodedPublicKey.trim().isEmpty()) {
                parsed = KeyFactory.getInstance("RSA").generatePublic(new X509EncodedKeySpec(
                    Base64.getDecoder().decode(encodedPublicKey.replaceAll("\\s", ""))));
                if (!(parsed instanceof RSAPublicKey) || ((RSAPublicKey) parsed).getModulus().bitLength() < 2048) parsed = null;
            }
        } catch (Exception ignored) { /* Missing/malformed configuration fails closed. */ }
        key = parsed;
    }
    public boolean isConfigured() { return key != null; }
    public boolean verify(String originalJson, String encodedSignature) {
        if (key == null || originalJson == null || originalJson.isEmpty() || encodedSignature == null || encodedSignature.isEmpty()) return false;
        try {
            // Play's RSA-SHA1 receipt format; not APK signing or TLS configuration.
            Signature verifier = Signature.getInstance("SHA1withRSA");
            verifier.initVerify(key);
            verifier.update(originalJson.getBytes(StandardCharsets.UTF_8));
            return verifier.verify(Base64.getDecoder().decode(encodedSignature));
        } catch (Exception ignored) { return false; }
    }
}
