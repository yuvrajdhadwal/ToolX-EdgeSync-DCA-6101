import pytest


pytestmark = pytest.mark.field_shop_professional


class TestFieldShopProfessionalDatabaseBehavior:
    def test_professional_can_download_firmware(self, factory):
        professional = factory.field_shop_professional()
        firmware = factory.firmware()

        factory.link_downloadable(professional, firmware)

        assert any(item.id == firmware.id for item in professional.download_firmware)

    def test_professional_can_create_install_and_rejection_records(self, factory):
        professional = factory.field_shop_professional()
        firmware = factory.firmware()
        device = factory.device(firmware=firmware)

        install = factory.install(professional=professional, firmware=firmware, device=device)
        rejection = factory.rejection(professional=professional, firmware=firmware, device=device)

        assert install.professional_id == professional.id
        assert rejection.professional_id == professional.id
