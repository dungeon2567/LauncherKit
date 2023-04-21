#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

extern crate reqwest;

use futures_util::{StreamExt, TryStreamExt};
use single_instance::SingleInstance;
use std::cmp::min;
use std::collections::HashMap;
use std::fs::File;
use std::hash::Hash;
use std::io::Write;
use async_process::Command;
use std::{fs, io, path::PathBuf};
use tokio_util::codec::{BytesCodec, FramedRead};

use read_progress_stream::ReadProgressStream;

use tauri::{
    CustomMenuItem, Manager, Menu, MenuItem, Submenu, SystemTray, SystemTrayEvent, SystemTrayMenu,
    Window,
};

#[derive(Clone, serde::Serialize)]
struct ProgressPayload {
    total: u64,
    current: u64,
}

fn file_size_recursive_impl(path: impl Into<PathBuf>, output: &mut HashMap<String, String>) {
    fn file_size_recursive_impl(mut dir: fs::ReadDir, output: &mut HashMap<String, String>) {
        dir.for_each(|file| {
            let file = file.unwrap();

            match file.metadata().unwrap() {
                data if data.is_dir() => {
                    file_size_recursive_impl(fs::read_dir(file.path()).unwrap(), output)
                }
                data => {
                    output.insert(
                        file.path().to_string_lossy().to_string(),
                        data.len().to_string(),
                    );
                }
            };
        });
    }

    file_size_recursive_impl(fs::read_dir(path.into()).unwrap(), output)
}

#[tauri::command]
fn file_size_recursive(path: String) -> HashMap<String, String> {
    let mut output = HashMap::new();

    file_size_recursive_impl(path, &mut output);

    return output;
}

pub fn get_menu() -> Menu {
    #[allow(unused_mut)]
    let mut disable_item =
        CustomMenuItem::new("disable-menu", "Disable menu").accelerator("CmdOrControl+D");
    #[allow(unused_mut)]
    let mut test_item = CustomMenuItem::new("test", "Test").accelerator("CmdOrControl+T");
    #[cfg(target_os = "macos")]
    {
        disable_item = disable_item.native_image(tauri::NativeImage::MenuOnState);
        test_item = test_item.native_image(tauri::NativeImage::Add);
    }

    // create a submenu
    let my_sub_menu = Menu::new().add_item(disable_item);

    let my_app_menu = Menu::new()
        .add_native_item(MenuItem::Copy)
        .add_submenu(Submenu::new("Sub menu", my_sub_menu));

    let test_menu = Menu::new()
        .add_item(CustomMenuItem::new(
            "selected/disabled",
            "Selected and disabled",
        ))
        .add_native_item(MenuItem::Separator)
        .add_item(test_item);

    // add all our childs to the menu (order is how they'll appear)
    Menu::new()
        .add_submenu(Submenu::new("My app", my_app_menu))
        .add_submenu(Submenu::new("Other menu", test_menu))
}

#[tauri::command]
async fn download_file(
    window: Window,
    uid: String,
    url: String,
    filename: String,
) -> Result<(), String> {
    let event = ["__progress__", &uid].concat();

    let res = reqwest::get(url)
        .await
        .or(Err(format!("Failed to GET from")))?;

    let total_size = res
        .content_length()
        .ok_or(format!("Failed to get content length"))?;

    let mut file = File::create(filename).or(Err(format!("Failed to create file")))?;

    let mut downloaded: u64 = 0;
    let mut stream = res.bytes_stream();

    window
        .emit(
            &event.clone(),
            ProgressPayload {
                total: total_size,
                current: 0,
            },
        )
        .unwrap();

    while let Some(item) = stream.next().await {
        let chunk = item.or(Err(format!("Error while downloading file")))?;

        file.write_all(&chunk)
            .or(Err(format!("Error while writing to file")))?;

        let new = min(downloaded + (chunk.len() as u64), total_size);

        downloaded = new;

        window
            .emit(
                &event.clone(),
                ProgressPayload {
                    total: total_size,
                    current: downloaded,
                },
            )
            .unwrap();
    }

    return Ok(());
}

#[tauri::command]
fn file_exists(path: String) -> bool {
    fs::metadata(path).is_ok()
}

#[tauri::command]
async fn open_game(exe: String, access_token: String, refresh_token: String) -> Result<String, String> {
    let child = Command::new(exe)
        .args(["Firebase".to_string(), access_token, refresh_token])
       .output()
       .await
       .expect("failed to start external executable");

    return Ok("OK".to_string());
}

#[tauri::command]
fn remove_dir(path: String) {
    let _ = fs::remove_dir_all(path);
}

#[tauri::command]
fn create_dir(path: String) {
    let _ = fs::create_dir_all(path);
}

#[tauri::command]
async fn upload_file(
    window: Window,
    uid: String,
    url: String,
    filename: String,
    headers: HashMap<String, String>,
) -> Result<String, String> {
    let event = ["__progress__", &uid].concat();

    
    // Read the file
    // Create the request and attach the file to the body
    let client = reqwest::Client::new();

    let file = tokio::fs::File::open(filename.clone()).await.unwrap();


    let stream = FramedRead::new(file, BytesCodec::new()).map_ok(|r| r.freeze());

    let content_length = fs::metadata(filename.clone()).unwrap().len();
    let mut __progress = 0 as u64;

    let body = reqwest::Body::wrap_stream(ReadProgressStream::new(
        stream,
        Box::new(move |progress, total| {
            __progress += progress;

            let _ = window
                .emit(
                    &event.clone(),
                    ProgressPayload {
                        total: content_length,
                        current: __progress,
                    },
                )
                .unwrap();
        }),
    ));

    let mut request = client.put(url).body(body);

    request = request.header("Content-Length", content_length);

    for (key, value) in headers {
        request = request.header(&key, value);
    }

    let res = request
        .send()
        .await
        .or(Err(format!("Failed to PUT file")))?;

    return Ok(res.text().await.or(Err(format!("Failed to PUT file")))?);
}

fn main() {
    let instance = SingleInstance::new("open_game_launcher").unwrap();

    if instance.is_single() {
        tauri::Builder::default()
            .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
                let window = app.get_window("main").unwrap();
                
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }))
            .invoke_handler(tauri::generate_handler![
                download_file,
                upload_file,
                file_exists,
                open_game,
                file_size_recursive,
                remove_dir,
                create_dir
            ])
            .menu(get_menu())
            .on_menu_event(|event| {
                println!("{:?}", event.menu_item_id());
            })
            .system_tray(
                SystemTray::new().with_menu(
                    SystemTrayMenu::new()
                        .add_item(CustomMenuItem::new("show", "Show"))
                        .add_item(CustomMenuItem::new("exit_app", "Quit")),
                ),
            )
            .on_system_tray_event(|app, event| match event {
                SystemTrayEvent::LeftClick {
                    position: _,
                    size: _,
                    ..
                } => {
                    let window = app.get_window("main").unwrap();

                    let _ = window.show();
                    let _ = window.unminimize();
                    let _ = window.set_focus();
                }
                SystemTrayEvent::MenuItemClick { id, .. } => {
                    match id.as_str() {
                        "exit_app" => {
                            // exit the app
                            app.exit(0);
                        }
                        "show" => {
                            let window = app.get_window("main").unwrap();

                            window.show().unwrap();
                        }
                        _ => {}
                    }
                }
                _ => {}
            })
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    } else {
        tauri::Builder::default()
            .plugin(tauri_plugin_single_instance::init(|app, _argv, _cwd| {
                app.get_window("main").unwrap().show().unwrap();
            }))
            .run(tauri::generate_context!())
            .expect("error while running tauri application");
    }
}
