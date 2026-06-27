#include <QApplication>
#include <QWidget>
#include <QVBoxLayout>
#include "taskbar_final.cpp"
#include "icons.cpp"

class Desktop : public QWidget {
public:
    Desktop() {
        setWindowTitle("NAS-PRO OS LEVEL");

        QVBoxLayout *layout = new QVBoxLayout(this);

        QWidget *workspace = new QWidget();
        workspace->setStyleSheet("background-color:#1e1e1e;");

        TaskBar *bar = new TaskBar();

        DesktopIcon *file = new DesktopIcon("Files", workspace);
        DesktopIcon *terminal = new DesktopIcon("Terminal", workspace);
        DesktopIcon *settings = new DesktopIcon("Settings", workspace);

        layout->addWidget(workspace);
        layout->addWidget(bar);
    }
};

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    Desktop d;
    d.resize(1000, 700);
    d.show();

    return app.exec();
}
