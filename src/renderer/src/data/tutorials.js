import apkOnlyImg from '../assets/install_game/apk_only.png'
import apkObbImg from '../assets/install_game/apk_obb.png'
import allowUsbDebuggingImg from '../assets/allow_usb_debugging.jpg'
import availableToggleDevModeImg from '../assets/connecting_quest/available_toggle_dev_mode.jpg'
import devModeNotReadyImg from '../assets/connecting_quest/dev_mode_not_ready.jpg'

export const tutorials = [
  {
    id: 'install_game',
    icon: 'mdi:gamepad-variant',
    titleKey: 'tutorial_install_game_title',
    descriptionKey: 'tutorial_install_game_desc',
    noteKey: 'tutorial_install_game_note',
    warningKey: 'tutorial_install_game_warning',
    steps: [
      { textKey: 'tutorial_install_game_step1' },
      {
        textKey: 'tutorial_install_game_step2',
        link: {
          url: 'https://hypertopia.store/vr-games/list-games/standalone',
          labelKey: 'tutorial_link_download_game',
          external: true
        }
      },
      { textKey: 'tutorial_install_game_step3' },
      { textKey: 'tutorial_install_game_step4' },
      {
        textKey: 'tutorial_install_game_step5',
        subSteps: [
          {
            textKey: 'tutorial_install_game_step5_apk_obb',
            image: apkObbImg
          },
          {
            textKey: 'tutorial_install_game_step5_apk_only',
            image: apkOnlyImg
          }
        ]
      },
      {
        textKey: 'tutorial_install_game_step6'
      }
      // Note key was here, moved to root
    ]
  },
  {
    id: 'uninstall_app',
    icon: 'mdi:trash-can',
    titleKey: 'tutorial_uninstall_app_title',
    descriptionKey: 'tutorial_uninstall_app_desc',
    steps: [
      { textKey: 'tutorial_uninstall_app_step1' },
      { textKey: 'tutorial_uninstall_app_step2' },
      { textKey: 'tutorial_uninstall_app_step3' },
      { textKey: 'tutorial_uninstall_app_step4' }
    ]
  },
  {
    id: 'connect_device',
    icon: 'mdi:usb',
    titleKey: 'tutorial_connect_device_title',
    descriptionKey: 'tutorial_connect_device_desc',
    steps: [
      {
        textKey: 'tutorial_connect_device_step1',
        image: availableToggleDevModeImg,
        subSteps: [
          {
            textKey: 'tutorial_connect_device_step1_note',
            image: devModeNotReadyImg,
            link: {
              url: 'https://hypertopia.store/vr-games/tutorials#developer-mode',
              labelKey: 'tutorial_link_dev_mode'
            }
          }
        ]
      },
      { textKey: 'tutorial_connect_device_step2' },
      {
        textKey: 'tutorial_connect_device_step3',
        image: allowUsbDebuggingImg
      },
      { textKey: 'tutorial_connect_device_step4' }
    ]
  }
]
