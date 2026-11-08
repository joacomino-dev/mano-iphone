import importlib.util
from pathlib import Path
import tempfile
import unittest
import zipfile

spec=importlib.util.spec_from_file_location('channel',Path(__file__).parents[1]/'check-android-channel.py')
channel=importlib.util.module_from_spec(spec);spec.loader.exec_module(channel)


class ChannelTests(unittest.TestCase):
    def setUp(self):
        self.folder=tempfile.TemporaryDirectory();self.addCleanup(self.folder.cleanup);self.root=Path(self.folder.name)
        (self.root/'mano/src').mkdir(parents=True);(self.root/'mano/dist/native/assets').mkdir(parents=True)
        (self.root/'mano/src/channel.ts').write_text('export const DEVELOPER = false;\n')
        (self.root/'mano/dist/native/index.html').write_text('<script src="assets/app.js"></script>')
        (self.root/'mano/dist/native/assets/app.js').write_text('store')
    def artifact(self,suffix,body='store'):
        path=self.root/('fixture'+suffix);prefix='base/assets/public/' if suffix=='.aab' else 'assets/public/'
        with zipfile.ZipFile(path,'w') as z:
            z.writestr(prefix+'index.html','<script src="assets/app.js"></script>');z.writestr(prefix+'assets/app.js',body)
        return path
    def test_store_aab_matches_exact_source(self):
        channel.verify(self.artifact('.aab'),channel.snapshot(self.root,'store'),'store')
    def test_changed_source_in_archive_rejected(self):
        with self.assertRaisesRegex(AssertionError,'Artifact source mismatch'):channel.verify(self.artifact('.apk','developer'),channel.snapshot(self.root,'store'),'store')
    def test_store_proof_cannot_label_development(self):
        with self.assertRaisesRegex(AssertionError,'Unexpected artifact channel'):channel.verify(self.artifact('.apk'),channel.snapshot(self.root,'store'),'development')
    def test_source_flag_must_match_before_build_is_accepted(self):
        with self.assertRaisesRegex(AssertionError,'Source channel mismatch'):channel.snapshot(self.root,'development')
    def test_development_apk_is_independently_bound(self):
        (self.root/'mano/src/channel.ts').write_text('export const DEVELOPER = true;\n');(self.root/'mano/dist/native/assets/app.js').write_text('developer')
        channel.verify(self.artifact('.apk','developer'),channel.snapshot(self.root,'development'),'development')


if __name__=='__main__':unittest.main()
