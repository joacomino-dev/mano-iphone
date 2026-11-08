package work.joaquin.mano;

import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.util.Base64;
import org.junit.Before;
import org.junit.Test;
import static org.junit.Assert.*;

public class PlayPurchaseVerifierTest {
    private KeyPair pair;
    private PlayPurchaseVerifier verifier;
    private final String receipt="{\"productId\":\"work.joaquin.mano.coffee\",\"packageName\":\"work.joaquin.mano\",\"purchaseToken\":\"synthetic-only\",\"note\":\"caf\u00e9\"}";
    @Before public void setUp() throws Exception {
        KeyPairGenerator generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);
        pair=generator.generateKeyPair();verifier=new PlayPurchaseVerifier(Base64.getEncoder().encodeToString(pair.getPublic().getEncoded()));
    }
    private String signed(String data) throws Exception {
        Signature signature=Signature.getInstance("SHA1withRSA");signature.initSign(pair.getPrivate());signature.update(data.getBytes(StandardCharsets.UTF_8));
        return Base64.getEncoder().encodeToString(signature.sign());
    }
    @Test public void validUtf8OriginalBytes() throws Exception { assertTrue(verifier.isConfigured());assertTrue(verifier.verify(receipt,signed(receipt))); }
    @Test public void changedProductFails() throws Exception { assertFalse(verifier.verify(receipt.replace("coffee","noads.lifetime"),signed(receipt))); }
    @Test public void changedPackageFails() throws Exception { assertFalse(verifier.verify(receipt.replace("packageName","otherPackage"),signed(receipt))); }
    @Test public void changedFormattingFails() throws Exception { assertFalse(verifier.verify(receipt+" ",signed(receipt))); }
    @Test public void wrongKeyFails() throws Exception {
        KeyPairGenerator generator=KeyPairGenerator.getInstance("RSA");generator.initialize(2048);
        PlayPurchaseVerifier other=new PlayPurchaseVerifier(Base64.getEncoder().encodeToString(generator.generateKeyPair().getPublic().getEncoded()));
        assertFalse(other.verify(receipt,signed(receipt)));
    }
    @Test public void malformedFails() { assertFalse(verifier.verify(receipt,"invalid!"));assertFalse(verifier.verify(null,""));assertFalse(verifier.verify(receipt,"")); }
    @Test public void missingConfigurationFails() throws Exception {
        for (String key:new String[]{null,"","not a key"}) { PlayPurchaseVerifier v=new PlayPurchaseVerifier(key);assertFalse(v.isConfigured());assertFalse(v.verify(receipt,signed(receipt))); }
    }
}
