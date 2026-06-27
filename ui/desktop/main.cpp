#include <QApplication>
#include <QWidget>
#include <QLabel>

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    QWidget window;
    window.setWindowTitle("NAS-PRO Desktop");

    QLabel label("NAS-PRO Native Desktop Running", &window);
    label.move(20, 20);

    window.resize(800, 500);
    window.show();

    return app.exec();
}
