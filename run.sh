#!/bin/bash

show_menu() {
    clear
    echo -e "\n请选择要启动的项目："
    echo -e "\n[1] Server only (Python)\n[2] Server only (UV)\n[3] Server and Web Dev\n\n"
}

run_option1() {
    cd server && python main.py
    echo -e "\nPython Server Started!"
}

run_option2() {
    cd server && uv run python main.py
    echo -e "\nPython Server (UV) Started!"
}

run_option3() {
    cd server && python main.py &
    cd ../web && pnpm run dev
    echo -e "\nServer (Python) & Web Dev Started!"
}

while true; do
    show_menu
    read -p "请输入选项(1/2/3): " choice

    case $choice in
        1) run_option1 ;;
        2) run_option2 ;;
        3) run_option3 ;;
        *) echo "无效选择！" ;;
    esac

    echo -e "\n按Enter继续，按Ctrl+C退出"
    read -n1 -s
done
