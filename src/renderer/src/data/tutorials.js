import apkOnlyImg from '../assets/install_game/apk_only.png'
import apkObbImg from '../assets/install_game/apk_obb.png'
import allowUsbDebuggingImg from '../assets/allow_usb_debugging.jpg'
import availableToggleDevModeImg from '../assets/connecting_quest/available_toggle_dev_mode.jpg'
import devModeNotReadyImg from '../assets/connecting_quest/dev_mode_not_ready.jpg'
import howToExtractImg from '../assets/install_game/how_to_extract.png'
import extractResultImg from '../assets/install_game/extract_result.png'
import sidebarBrowseFileImg from '../assets/install_game/sidebar_browse_file.png'
import chooseMethodFolderImg from '../assets/install_game/choose_method_folder.png'
import selectGameFolderImg from '../assets/install_game/select_game_folder.png'
import detectedImg from '../assets/install_game/detected.png'

export const tutorials = [
  {
    id: 'install_game',
    icon: 'mdi:gamepad-variant',
    titleKey: 'tutorial_install_game_title',
    descriptionKey: 'tutorial_install_game_desc',
    noteKey: 'tutorial_install_game_note',
    tabs: [
      {
        id: 'zip_rar',
        titleKey: 'tutorial_tab_zip_rar',
        steps: [
          { textKey: 'tutorial_install_game_step1' },
          {
            textKey: 'tutorial_install_game_step2',
            link: {
              url: 'https://hypertopia.web.id/vr-games/list-games/standalone',
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
        ]
      },
      {
        id: 'folder_extract',
        titleKey: 'tutorial_tab_folder_extract',
        steps: [
          { textKey: 'tutorial_install_game_folder_step1' },
          { textKey: 'tutorial_install_game_folder_step2' },
          { textKey: 'tutorial_install_game_folder_step3', image: howToExtractImg },
          { textKey: 'tutorial_install_game_folder_step4', image: extractResultImg },
          { textKey: 'tutorial_install_game_folder_step5', image: sidebarBrowseFileImg },
          { textKey: 'tutorial_install_game_folder_step6', image: chooseMethodFolderImg },
          { textKey: 'tutorial_install_game_folder_step7', image: selectGameFolderImg },
          { textKey: 'tutorial_install_game_folder_step8', image: detectedImg }
        ]
      }
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
              url: 'https://hypertopia.web.id/vr-games/tutorials#developer-mode',
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
  },
  {
    id: 'redeem_access',
    icon: 'mdi:ticket-confirmation',
    titleKey: 'tutorial_redeem_title',
    descriptionKey: 'tutorial_redeem_desc',
    noteKey: 'tutorial_redeem_note',
    steps: [
      { textKey: 'tutorial_redeem_step1' },
      { textKey: 'tutorial_redeem_step2' },
      { textKey: 'tutorial_redeem_step3' },
      { textKey: 'tutorial_redeem_step4' },
      { textKey: 'tutorial_redeem_step5' },
      { textKey: 'tutorial_redeem_step6' }
    ]
  }
]
