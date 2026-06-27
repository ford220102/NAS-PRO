#include <QApplication>
#include <QWidget>
#include <QVBoxLayout>
#include "taskbar.cpp"

class Desktop : public QWidget {
public:
    Desktop() {
        setWindowTitle("NAS-PRO Desktop");

        QVBoxLayout *layout = new QVBoxLayout(this);

        TaskBar *bar = new TaskBar();

        QWidget *workspace = new QWidget();
        workspace->setStyleSheet("background-color:#222;");

        layout->addWidget(workspace);
        layout->addWidget(bar);
    }
};

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    Desktop d;
    d.resize(900, 600);
    d.show();

    return app.exec();
}
